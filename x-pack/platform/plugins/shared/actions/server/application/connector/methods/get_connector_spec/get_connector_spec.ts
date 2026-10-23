/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import { getRegisteredSpec } from '../../../../specs_client/lib/get_registered_spec';
import { serializeSpecDetail } from '../../../../specs_client/lib/serialize_spec_detail';
import type { GetConnectorSpecParams } from './types';

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

  const registered = getRegisteredSpec(context.actionTypeRegistry, id);
  const detail = serializeSpecDetail(registered, configurationUtilities);

  return {
    metadata: registered.spec.metadata,
    schema: detail.formSchema,
    isTestable: detail.isTestable,
    actions: detail.actions.map(({ name, isTool, description, scope }) => ({
      name,
      isTool,
      ...(description !== undefined ? { description } : {}),
      scope,
    })),
  };
}
