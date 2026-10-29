/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { v4 as uuidv4 } from 'uuid';
import { set } from '@kbn/safer-lodash-set';
import type {
  CreateImportData,
  CreateImportResponse,
  CreateManagedImportData,
  ImportCredentialsResponse,
  ImportResponse,
  TestImportResponse,
  UpdateImportData,
} from '@kbn/alerting-v2-schemas';
import { buildInboundEventsUrl, ImportAlertsConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { KibanaRequest } from '@kbn/core-http-server';
import { Request } from '@kbn/core-di-server';
import { SavedObjectsUtils } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { asSpaceId } from '@kbn/core-spaces-common';
import { inject, injectable } from 'inversify';
import { ALERTING_ERROR_CODES, ALERTING_LOG_CODES } from '../errors/error_codes';
import { KibanaBaseUrlToken } from '../dispatcher/tokens';
import { WorkflowsManagementApiToken } from '../dispatcher/steps/dispatch_step_tokens';
import { ImportConfigClient } from '../import_config_client';
import { toImportSource } from '../import_config_client/utils';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { buildCustomImportWorkflowYaml } from './build_custom_import_workflow_yaml';
import { getManagedImportType } from './managed_import_types';
import { ActionsClientToken, PublicBaseUrlToken } from './tokens';

/** The parts of the actions client the setup uses. */
export type ImportSetupActionsClient = Pick<
  ActionsClient,
  'create' | 'delete' | 'get' | 'rotateInboundIngress' | 'listTypes'
>;

/** The parts of the import config client the setup uses. */
export type ImportSetupConfigClient = Pick<
  ImportConfigClient,
  'createImportConfig' | 'getImportConfig' | 'updateImportConfig' | 'deleteImportConfig'
>;

/** The parts of the workflows management API the setup uses. */
export type ImportSetupWorkflowsApi = Pick<
  WorkflowsServerPluginSetup['management'],
  | 'createWorkflow'
  | 'deleteWorkflows'
  | 'updateWorkflow'
  | 'testWorkflow'
  | 'getWorkflow'
  | 'getWorkflowExecutions'
>;

const INBOUND_WEBHOOK_CONNECTOR_TYPE_ID = '.inboundWebhook';

type ImportSetupStep = 'create_connector' | 'rotate_token' | 'create_workflow' | 'save_import';

const getStatusCode = (e: unknown): number => (Boom.isBoom(e) ? e.output.statusCode : 500);

const getMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

const isNotFound = (e: unknown): boolean =>
  getStatusCode(e) === 404 || (e instanceof Error && e.name === 'WorkflowNotFoundError');

/**
 * Sets up and tears down everything a custom import is made of: an `.inboundWebhook` connector
 * with an ingest token, the workflow that turns payloads into alerts, and the config record that
 * ties them together.
 */
@injectable()
export class ImportSetupService {
  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(ImportConfigClient) private readonly importConfigClient: ImportSetupConfigClient,
    @inject(ActionsClientToken) private readonly actionsClient: ImportSetupActionsClient,
    @inject(WorkflowsManagementApiToken)
    private readonly workflowsManagement: ImportSetupWorkflowsApi,
    @inject(Request) private readonly request: KibanaRequest,
    @inject(RequestSpaceIdToken) private readonly spaceId: string,
    @inject(KibanaBaseUrlToken) private readonly kibanaBaseUrl: string,
    @inject(PublicBaseUrlToken) private readonly publicBaseUrl: string | undefined,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    this.logger = loggerService.forSubsystem('importSetup');
  }

  /**
   * Creates the connector, its ingest token, the workflow and the config record, in that order.
   * When a step fails, what the earlier steps created is removed again, newest first, and the
   * error names the step that failed.
   */
  public async createImport(data: CreateImportData): Promise<CreateImportResponse> {
    const id = SavedObjectsUtils.generateId();
    const source = data.source ?? toImportSource(data.name);
    const undo: Array<{ resource: string; run: () => Promise<void> }> = [];

    let step: ImportSetupStep = 'create_connector';
    try {
      const connector = await this.actionsClient.create({
        action: {
          name: `Import: ${data.name}`,
          actionTypeId: INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
          config: {},
          secrets: { authType: 'none' },
        },
      });
      undo.push({
        resource: `connector ${connector.id}`,
        run: () => this.actionsClient.delete({ id: connector.id }).then(() => undefined),
      });

      step = 'rotate_token';
      const { ingestToken } = await this.actionsClient.rotateInboundIngress({ id: connector.id });

      step = 'create_workflow';
      const workflow = await this.workflowsManagement.createWorkflow(
        {
          yaml: buildCustomImportWorkflowYaml({
            name: data.name,
            importId: id,
            connectorId: connector.id,
            source,
            fingerprintField: data.fingerprint_field,
            severity: data.default_severity,
          }),
        },
        this.spaceId,
        this.request
      );
      undo.push({
        resource: `workflow ${workflow.id}`,
        run: () => this.deleteWorkflow(workflow.id),
      });

      const url = this.buildUrl(INBOUND_WEBHOOK_CONNECTOR_TYPE_ID, connector.id);

      step = 'save_import';
      const created = await this.importConfigClient.createImportConfig({
        data,
        id,
        source,
        connectorTypeId: INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
        connectorId: connector.id,
        workflowId: workflow.id,
      });

      return {
        import: created,
        url,
        credentials: { url, token: ingestToken },
        public_base_url_configured: this.publicBaseUrl !== undefined,
      };
    } catch (e) {
      const rolledBack = await this.rollBack(undo);
      throw new Boom.Boom(`Failed to set up the import at step "${step}": ${getMessage(e)}`, {
        statusCode: getStatusCode(e),
        data: {
          code: ALERTING_ERROR_CODES.IMPORT_SETUP_FAILED,
          details: { step, rolled_back: rolledBack },
        },
      });
    }
  }

  /**
   * Creates a managed import on a connector the user already has. Nothing is created for the
   * connector or the workflow: the type's shared workflow already turns its events into alerts.
   * The record takes the connector's id, so the workflow can stamp it on alerts as the rule id
   * (`event.connectorId`) and there is at most one import per connector.
   *
   * The connector must have receiving events turned on. That cannot be done from here, because
   * turning it on is a connector update that needs the connector's secrets, so the error says
   * what to do and the UI sends people to the connector.
   */
  public async createManagedImport(data: CreateManagedImportData): Promise<CreateImportResponse> {
    const connector = await this.actionsClient.get({ id: data.connector_id });

    const supportedTypes = await this.actionsClient.listTypes({
      featureId: ImportAlertsConnectorFeatureId,
    });
    const managedType = getManagedImportType(connector.actionTypeId);
    if (!managedType || !supportedTypes.some(({ id }) => id === connector.actionTypeId)) {
      throw Boom.badRequest(
        `Connectors of type "${connector.actionTypeId}" cannot be used to import alerts.`,
        { code: ALERTING_ERROR_CODES.IMPORT_CONNECTOR_NOT_SUPPORTED }
      );
    }

    if (connector.isInboundEventsEnabled !== true) {
      throw Boom.badRequest(
        `Connector "${connector.name}" has receiving events turned off. Edit the connector and turn on "Receive events".`,
        { code: ALERTING_ERROR_CODES.IMPORT_CONNECTOR_INBOUND_DISABLED }
      );
    }

    const existing = await this.importConfigClient
      .getImportConfig({ id: connector.id })
      .catch((e: unknown) => {
        if (isNotFound(e)) return undefined;
        throw e;
      });
    if (existing) {
      throw Boom.conflict(`Connector "${connector.name}" already has an import.`, {
        code: ALERTING_ERROR_CODES.IMPORT_ALREADY_EXISTS,
        details: { import_id: existing.id },
      });
    }

    const created = await this.importConfigClient.createImportConfig({
      data: { ...data, name: data.name ?? connector.name },
      id: connector.id,
      kind: 'managed',
      source: managedType.source,
      connectorTypeId: connector.actionTypeId,
      connectorId: connector.id,
      workflowId: managedType.workflowId,
    });

    // No token is minted: the connector may already be wired to its source, and rotating would
    // cut that. The token of a new connector is shown by the connector flyout, and "rotate
    // token" mints a new one on request.
    return {
      import: created,
      url: this.buildUrl(connector.actionTypeId, connector.id),
      public_base_url_configured: this.publicBaseUrl !== undefined,
    };
  }

  /** Mints a new ingest token. The previous one stops working immediately. */
  public async rotateToken({ id }: { id: string }): Promise<ImportCredentialsResponse> {
    const config = await this.importConfigClient.getImportConfig({ id });
    const connectorTypeId = config.connector_type_id ?? INBOUND_WEBHOOK_CONNECTOR_TYPE_ID;
    const { ingestToken } = await this.actionsClient.rotateInboundIngress({
      id: config.connector_id,
    });

    return {
      credentials: { url: this.buildUrl(connectorTypeId, config.connector_id), token: ingestToken },
      public_base_url_configured: this.publicBaseUrl !== undefined,
    };
  }

  /**
   * Runs the import's workflow once with a sample payload as the webhook body. This is the real
   * workflow, so it writes a real alert. It does not go through the webhook URL, so it works
   * without a token and says nothing about whether the source can reach Kibana.
   */
  public async testImport({
    id,
    payload,
  }: {
    id: string;
    payload?: Record<string, unknown>;
  }): Promise<TestImportResponse> {
    const config = await this.importConfigClient.getImportConfig({ id });
    const connectorTypeId = config.connector_type_id ?? INBOUND_WEBHOOK_CONNECTOR_TYPE_ID;
    const managedType =
      config.kind === 'managed' ? getManagedImportType(connectorTypeId) : undefined;
    const body = payload ?? managedType?.buildSampleBody(config.name) ?? buildSamplePayload(config);

    const executionId = await this.workflowsManagement.testWorkflow({
      workflowId: config.workflow_id,
      inputs: {
        event: {
          body,
          connectorId: config.connector_id,
          connectorTypeId,
          spaceId: this.spaceId,
          correlationKey: uuidv4(),
        },
      },
      spaceId: this.spaceId,
      request: this.request,
    });

    return { execution_id: executionId, payload: body };
  }

  /**
   * Updates the config record. Switching `enabled` also switches the workflow, which is what
   * decides whether payloads become alerts.
   */
  public async updateImport({
    id,
    data,
  }: {
    id: string;
    data: UpdateImportData;
  }): Promise<ImportResponse> {
    if (data.enabled !== undefined) {
      const config = await this.importConfigClient.getImportConfig({ id });
      // A managed import shares its workflow with every connector of the type, so it is never
      // switched from here.
      if (config.kind === 'managed') {
        return this.importConfigClient.updateImportConfig({ id, data });
      }
      try {
        await this.workflowsManagement.updateWorkflow(
          config.workflow_id,
          { enabled: data.enabled },
          this.spaceId,
          this.request
        );
      } catch (e) {
        // A deleted workflow is reported by the import's status, it must not block the edit.
        if (!isNotFound(e)) {
          throw e;
        }
      }
    }

    return this.importConfigClient.updateImportConfig({ id, data });
  }

  /**
   * Deletes the config record, and with `deleteResources` the workflow and the connector too. For a
   * managed import only the connector (the user's own) is deleted, never the shared workflow.
   * Resources that are already gone are skipped. When one cannot be deleted the record is kept,
   * so the delete can be retried.
   */
  public async deleteImport({
    id,
    deleteResources,
  }: {
    id: string;
    deleteResources: boolean;
  }): Promise<void> {
    const config = await this.importConfigClient.getImportConfig({ id });

    if (deleteResources) {
      // The workflow of a managed import is shared and managed, it is never deleted.
      if (config.kind !== 'managed') {
        await this.ignoreNotFound(() => this.deleteWorkflow(config.workflow_id));
      }
      await this.ignoreNotFound(() =>
        this.actionsClient.delete({ id: config.connector_id }).then(() => undefined)
      );
    }

    await this.importConfigClient.deleteImportConfig({ id });
  }

  private buildUrl(connectorTypeId: string, connectorId: string): string {
    return buildInboundEventsUrl({
      publicBaseUrl: this.publicBaseUrl ?? this.kibanaBaseUrl,
      spaceId: asSpaceId(this.spaceId),
      connectorTypeId,
      connectorId,
    });
  }

  private async deleteWorkflow(workflowId: string): Promise<void> {
    const result = await this.workflowsManagement.deleteWorkflows(
      [workflowId],
      this.spaceId,
      this.request
    );
    const [failure] = result.failures;
    if (failure) {
      throw failure.error.toLowerCase().includes('not found')
        ? Boom.notFound(failure.error)
        : new Error(failure.error);
    }
  }

  private async ignoreNotFound(run: () => Promise<void>): Promise<void> {
    try {
      await run();
    } catch (e) {
      if (!isNotFound(e)) {
        throw e;
      }
    }
  }

  /** Runs the undo steps newest first. A failing one is logged and does not stop the others. */
  private async rollBack(
    undo: Array<{ resource: string; run: () => Promise<void> }>
  ): Promise<string[]> {
    const rolledBack: string[] = [];
    for (const { resource, run } of [...undo].reverse()) {
      try {
        await run();
        rolledBack.push(resource);
      } catch (error) {
        this.logger.error({
          message: `Failed to remove ${resource} while rolling back a failed import setup`,
          error,
          code: ALERTING_LOG_CODES.IMPORT_ROLLBACK_FAILED,
        });
      }
    }
    return rolledBack;
  }
}

const buildSamplePayload = ({
  name,
  fingerprint_field: fingerprintField,
}: ImportResponse): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    title: `Test alert from ${name}`,
    message: 'Sent by "Send test alert". Delete it from the alerts page when done.',
    test: true,
  };
  if (fingerprintField) {
    set(payload, fingerprintField, `test-${uuidv4().slice(0, 8)}`);
  }
  return payload;
};
