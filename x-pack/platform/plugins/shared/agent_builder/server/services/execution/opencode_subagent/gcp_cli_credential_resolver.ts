/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { InMemoryConnector } from '@kbn/actions-plugin/server';

const GCP_CLI_ACTION_TYPE_ID = '.gcp_cli';
const ACTION_SAVED_OBJECT_TYPE = 'action';
const GCP_SERVICE_ACCOUNT_AUTH_TYPE = 'gcp_service_account';

interface RawActionAttributes {
  actionTypeId: string;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}

interface ConnectorMaterial {
  config?: Record<string, unknown>;
  secrets?: Record<string, unknown>;
}

type ScopedActionsClient = Awaited<ReturnType<ActionsPluginStart['getActionsClientWithRequest']>>;

export type GcpCliAccess = 'read' | 'write';

export interface GcpCliCredentialRequest {
  connectorId?: string;
  projectId?: string;
  access?: GcpCliAccess;
  services?: string[];
  regions?: string[];
}

export interface GcpCliCredentials {
  serviceAccountJson: string;
  projectId: string;
  connectorId: string;
  source: 'gcp_cli_connector';
}

const parseCsv = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string').map((v) => v.trim());
  }
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split(/[,\s]+/)
    .map((v) => v.trim())
    .filter(Boolean);
};

const normalizeList = (values?: string[]): string[] => [
  ...new Set((values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean)),
];

const missingAllowedValues = (requested: string[] | undefined, allowed: string[]): string[] => {
  if (!requested?.length || allowed.length === 0) {
    return [];
  }
  const normalizedAllowed = new Set(allowed.map((value) => value.toLowerCase()));
  return normalizeList(requested).filter((value) => !normalizedAllowed.has(value));
};

const parseServiceAccountProject = (serviceAccountJson: string): string | undefined => {
  try {
    const parsed = JSON.parse(serviceAccountJson) as { project_id?: unknown };
    return typeof parsed.project_id === 'string' ? parsed.project_id : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Resolves a generic Google Cloud CLI connector into run-scoped sandbox config.
 *
 * POC note: this path injects the service account JSON into the sandbox and
 * scrubs it after the run. That matches how `gcloud` expects service account
 * auth, but it is not as strong as a future impersonation-based short-lived
 * token flow.
 */
export class GcpCliCredentialResolver {
  constructor(
    private readonly getActions: () => Promise<ActionsPluginStart>,
    private readonly encryptedSavedObjects: EncryptedSavedObjectsPluginStart,
    private readonly logger: Logger
  ) {}

  async resolve({
    request,
    allowedConnectors,
    spaceId,
    requested,
    onDiagnostic,
  }: {
    request: KibanaRequest;
    allowedConnectors?: string[];
    spaceId?: string;
    requested: GcpCliCredentialRequest;
    onDiagnostic?: (message: string) => void;
  }): Promise<GcpCliCredentials | undefined> {
    try {
      const actions = await this.getActions();
      const actionsClient = await actions.getActionsClientWithRequest(request);
      const connectorIds = await this.resolveGcpCliConnectorIds(actionsClient, {
        allowedConnectors,
        connectorId: requested.connectorId,
      });
      if (connectorIds.length === 0) {
        onDiagnostic?.('No accessible Google Cloud CLI connector was found');
      }

      for (const connectorId of connectorIds) {
        const connector = await actionsClient.get({ id: connectorId }).catch(() => undefined);
        if (!connector || connector.actionTypeId !== GCP_CLI_ACTION_TYPE_ID) {
          continue;
        }

        const material = await this.readConnectorMaterial({
          connectorId,
          isPreconfigured: actionsClient.isPreconfigured(connectorId),
          actions,
          spaceId,
        });
        const credential = this.resolveFromConnector({
          connectorId,
          material,
          requested,
          onDiagnostic,
        });
        if (credential) {
          return credential;
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to resolve Google Cloud CLI connector credentials: ${(error as Error).message}`
      );
      onDiagnostic?.(
        `Failed to resolve Google Cloud CLI connector credentials: ${(error as Error).message}`
      );
    }

    return undefined;
  }

  private async resolveGcpCliConnectorIds(
    actionsClient: ScopedActionsClient,
    {
      allowedConnectors,
      connectorId,
    }: {
      allowedConnectors?: string[];
      connectorId?: string;
    }
  ): Promise<string[]> {
    if (connectorId) {
      return allowedConnectors && !allowedConnectors.includes(connectorId) ? [] : [connectorId];
    }

    if (allowedConnectors && allowedConnectors.length > 0) {
      return allowedConnectors;
    }

    const connectors = await actionsClient.getAll();
    return connectors
      .filter((connector) => connector.actionTypeId === GCP_CLI_ACTION_TYPE_ID)
      .map((connector) => connector.id);
  }

  private async readConnectorMaterial({
    connectorId,
    isPreconfigured,
    actions,
    spaceId,
  }: {
    connectorId: string;
    isPreconfigured: boolean;
    actions: ActionsPluginStart;
    spaceId?: string;
  }): Promise<ConnectorMaterial> {
    let config: Record<string, unknown> | undefined;
    let secrets: Record<string, unknown> | undefined;

    if (isPreconfigured) {
      const inMemory = actions.inMemoryConnectors.find(
        (c: InMemoryConnector) => c.id === connectorId
      );
      config = inMemory?.config as Record<string, unknown> | undefined;
      secrets = inMemory?.secrets as Record<string, unknown> | undefined;
    } else {
      const esoClient = this.encryptedSavedObjects.getClient({
        includedHiddenTypes: [ACTION_SAVED_OBJECT_TYPE],
      });
      const namespace = spaceId && spaceId !== 'default' ? spaceId : undefined;
      const raw = await esoClient.getDecryptedAsInternalUser<RawActionAttributes>(
        ACTION_SAVED_OBJECT_TYPE,
        connectorId,
        namespace ? { namespace } : {}
      );
      config = raw.attributes.config;
      secrets = raw.attributes.secrets;
    }

    return { config, secrets };
  }

  private resolveFromConnector({
    connectorId,
    material,
    requested,
    onDiagnostic,
  }: {
    connectorId: string;
    material: ConnectorMaterial;
    requested: GcpCliCredentialRequest;
    onDiagnostic?: (message: string) => void;
  }): GcpCliCredentials | undefined {
    const { config, secrets } = material;
    if (!config || !secrets) {
      return undefined;
    }

    if (secrets.authType !== GCP_SERVICE_ACCOUNT_AUTH_TYPE) {
      onDiagnostic?.(`Google Cloud CLI connector ${connectorId} does not use service account auth`);
      return undefined;
    }

    const serviceAccountJson =
      typeof secrets.serviceAccountJson === 'string' ? secrets.serviceAccountJson : undefined;
    if (!serviceAccountJson) {
      onDiagnostic?.(`Google Cloud CLI connector ${connectorId} is missing service account JSON`);
      return undefined;
    }

    const configuredProject = typeof config.projectId === 'string' ? config.projectId : undefined;
    const serviceAccountProject = parseServiceAccountProject(serviceAccountJson);
    const projectId = requested.projectId ?? configuredProject ?? serviceAccountProject;
    if (!projectId) {
      onDiagnostic?.(`Google Cloud CLI connector ${connectorId} requires a projectId`);
      return undefined;
    }

    if (configuredProject && requested.projectId && requested.projectId !== configuredProject) {
      onDiagnostic?.(
        `Google Cloud CLI connector ${connectorId} targets ${configuredProject}, not ${requested.projectId}`
      );
      return undefined;
    }

    const deniedServices = missingAllowedValues(
      requested.services,
      parseCsv(config.allowedServices)
    );
    if (deniedServices.length > 0) {
      onDiagnostic?.(
        `Google Cloud CLI connector ${connectorId} does not allow services: ${deniedServices.join(
          ', '
        )}`
      );
      return undefined;
    }

    const deniedRegions = missingAllowedValues(requested.regions, parseCsv(config.allowedRegions));
    if (deniedRegions.length > 0) {
      onDiagnostic?.(
        `Google Cloud CLI connector ${connectorId} does not allow regions: ${deniedRegions.join(
          ', '
        )}`
      );
      return undefined;
    }

    return {
      serviceAccountJson,
      projectId,
      connectorId,
      source: 'gcp_cli_connector',
    };
  }
}
