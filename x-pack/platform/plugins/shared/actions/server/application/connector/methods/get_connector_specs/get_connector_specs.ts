/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorsSpecs } from '@kbn/connector-specs';
import {
  serializeConnectorSpecCatalogEntry,
  type ConnectorSpecCatalogEntry,
} from '@kbn/connector-specs/src/lib/serialize_connector_spec_catalog';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import type { GetConnectorSpecsParams } from './types';

const specsByIdMap = new Map(
  Object.values(connectorsSpecs).map((spec) => [spec.metadata.id, spec])
);

export async function getConnectorSpecsAsJsonSchema({
  context,
}: GetConnectorSpecsParams): Promise<{ specs: ConnectorSpecCatalogEntry[] }> {
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

  const specs: ConnectorSpecCatalogEntry[] = [];
  for (const spec of specsByIdMap.values()) {
    try {
      specs.push(serializeConnectorSpecCatalogEntry(spec));
    } catch {
      // Skip specs whose action/event schemas cannot be serialized to JSON Schema.
    }
  }

  return { specs };
}
