/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import { resolveConnectorSpecVersion } from '../../../../lib/resolve_connector_spec_version';
import { getRegisteredSpec } from '../../../../specs_client/lib/get_registered_spec';
import { serializeSpecDetail } from '../../../../specs_client/lib/serialize_spec_detail';
import type { GetConnectorSpecParams, GetConnectorSpecResult } from './types';

export async function getConnectorSpecAsJsonSchema({
  context,
  id,
  specVersion,
  configurationUtilities,
}: GetConnectorSpecParams): Promise<GetConnectorSpecResult> {
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
  const { resolvedSpecVersion, selectedSpec } = configurationUtilities.isCatalogEnabled()
    ? resolveConnectorSpecVersion({
        actionType: context.actionTypeRegistry.get(id),
        specVersion,
        configurationUtilities,
      })
    : { resolvedSpecVersion: undefined, selectedSpec: registered.spec };
  const spec = selectedSpec ?? registered.spec;
  const detail = serializeSpecDetail({ ...registered, spec }, configurationUtilities);

  return {
    metadata: { ...spec.metadata, specVersion: resolvedSpecVersion },
    schema: detail.formSchema,
    isTestable: detail.isTestable,
    authTypeIds: detail.authTypeIds,
    hasInboundEvents: detail.hasInboundEvents,
    isInboundOnly: detail.isInboundOnly,
    isEarsExperimental: detail.isEarsExperimental,
    ...(detail.skill !== undefined ? { skill: detail.skill } : {}),
    actions: detail.actions.map(({ name, isTool, description, scope, inputSchema }) => ({
      name,
      isTool,
      ...(description !== undefined ? { description } : {}),
      scope,
      inputSchema,
    })),
  };
}
