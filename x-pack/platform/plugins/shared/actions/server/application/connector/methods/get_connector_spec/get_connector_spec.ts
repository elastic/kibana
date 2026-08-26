/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { serializeConnectorSpec } from '@kbn/connector-specs/src/lib/serialize_connector_spec';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import type { GetConnectorSpecParams } from './types';

export async function getConnectorSpecAsJsonSchema({
  context,
  id,
  version,
  configurationUtilities,
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

  const spec = context.actionTypeRegistry.tryResolveActionType(id, version)?.connectorSpec;
  const activeSpec = context.actionTypeRegistry.tryResolveActionType(id)?.connectorSpec;

  if (!spec || !activeSpec) {
    throw Boom.notFound(`Spec for connector type "${id}" not found.`);
  }

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
      ...(spec.version ? { version: spec.version } : {}),
      ...(activeSpec.version ? { activeVersion: activeSpec.version } : {}),
    };
  } catch (error) {
    throw new Error(
      `Failed to serialize connector spec: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
