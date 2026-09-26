/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { serializeConnectorSpec } from '@kbn/connector-specs/src/lib/serialize_connector_spec';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import type { ActionType } from '../../../../types';
import { SpecVersionRequestError } from '../../../../lib/errors/spec_version_request_error';
import type { GetConnectorSpecParams } from './types';

const resolveSpec = async (
  actionType: Pick<ActionType, 'connectorSpec' | 'specVersions'> | undefined,
  id: string,
  specVersion: string | undefined
): Promise<{ spec: ConnectorSpec; servedVersion?: string }> => {
  const { specVersions } = actionType ?? {};
  if (!specVersions) {
    const spec = actionType?.connectorSpec;
    if (!spec) {
      throw Boom.notFound(`Spec for connector type "${id}" not found.`);
    }
    return { spec };
  }
  const version = specVersion ?? specVersions.getLatestVersion();
  if (version === undefined) {
    throw Boom.notFound(`Spec for connector type "${id}" not found.`);
  }
  try {
    const spec = await specVersions.getSpec(version);
    return { spec, servedVersion: version };
  } catch (error) {
    if (error instanceof SpecVersionRequestError && error.reason !== 'not_stored') {
      throw Boom.badRequest(error.message);
    }
    throw Boom.notFound(
      `Spec version "${version}" for connector type "${id}" not found: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export async function getConnectorSpecAsJsonSchema({
  context,
  id,
  configurationUtilities,
  specVersion,
}: GetConnectorSpecParams) {
  try {
    await context.authorization.ensureAuthorized({ operation: 'get' });
  } catch (error) {
    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.GET,
        error,
      })
    );
    throw error;
  }

  const actionType = context.actionTypeRegistry.has(id)
    ? context.actionTypeRegistry.get(id)
    : undefined;
  const { spec, servedVersion } = await resolveSpec(actionType, id, specVersion);

  try {
    const webhookSettings = configurationUtilities.getWebhookSettings();
    const isPfxEnabled = webhookSettings.ssl.pfx.enabled;
    const isEarsEnabled = configurationUtilities.isEarsEnabled();
    const isEarsExperimentalEnabled = configurationUtilities.isEarsExperimentalEnabled();
    const serialized = serializeConnectorSpec(spec, {
      isPfxEnabled,
      isEarsEnabled,
      isEarsExperimentalEnabled,
    });
    return {
      metadata: serialized.metadata,
      schema: serialized.schema,
      isTestable: Boolean(spec.test.enabled),
      ...(servedVersion !== undefined ? { specVersion: servedVersion } : {}),
    };
  } catch (error) {
    throw new Error(
      `Failed to serialize connector spec: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
