/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { connectorsSpecs } from '@kbn/connector-specs';
import { serializeConnectorSpec } from '@kbn/connector-specs/src/lib/serialize_connector_spec';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import type { GetConnectorSpecParams } from './types';

const specsByIdMap = new Map(
  Object.values(connectorsSpecs).map((spec) => [spec.metadata.id, spec])
);

export async function getConnectorSpecAsJsonSchema({
  context,
  id,
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

  const spec = specsByIdMap.get(id);

  if (!spec) {
    throw Boom.notFound(`Spec for connector type "${id}" not found.`);
  }

  try {
    const webhookSettings = configurationUtilities.getWebhookSettings();
    const isPfxEnabled = webhookSettings.ssl.pfx.enabled;
    const isEarsEnabled = configurationUtilities.isEarsEnabled();
    const serialized = serializeConnectorSpec(spec, { isPfxEnabled, isEarsEnabled });
    return {
      metadata: serialized.metadata,
      schema: serialized.schema,
    };
  } catch (error) {
    throw new Error(
      `Failed to serialize connector spec: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
