/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ActionType as CommonActionType } from '../../../../../common';
import type { ConnectorSpecSummary } from '../../../../../common/connector_spec';
import type { ActionsClientContext } from '../../../../actions_client';
import { serializeSpecSummary } from '../../../../specs_client/lib/serialize_spec_summary';
import type { ConnectorType, ConnectorTypeSpecFields } from '../../types';
import { listTypesParamsSchema } from './schemas';
import type { ListTypesParams } from './types';

const toSpecFields = (summary: ConnectorSpecSummary): ConnectorTypeSpecFields => ({
  ...(summary.icon !== undefined ? { icon: summary.icon } : {}),
  ...(summary.docsUrl !== undefined ? { docsUrl: summary.docsUrl } : {}),
  authTypeIds: summary.authTypeIds,
  hasInboundEvents: summary.hasInboundEvents,
  isInboundOnly: summary.isInboundOnly,
  isEarsExperimental: summary.isEarsExperimental,
  actions: summary.actions,
});

const withSpecFields = (
  context: ActionsClientContext,
  type: CommonActionType
): CommonActionType & { spec?: ConnectorTypeSpecFields } => {
  if (type.source !== ACTION_TYPE_SOURCES.spec) {
    return type;
  }
  const spec = context.actionTypeRegistry.getSpec(type.id);
  if (!spec) {
    return type;
  }
  return { ...type, spec: toSpecFields(serializeSpecSummary({ spec, type })) };
};

export async function listTypes(
  context: ActionsClientContext,
  options: ListTypesParams
): Promise<ConnectorType[]> {
  try {
    listTypesParamsSchema.validate(options);
  } catch (error) {
    throw Boom.badRequest(`Error validating params - ${error.message}`);
  }

  const { featureId, includeSystemActionTypes } = options;

  const connectorTypes = context.actionTypeRegistry.list({ featureId });

  const filteredConnectorTypes = includeSystemActionTypes
    ? connectorTypes
    : connectorTypes.filter((type) => !type.isSystemActionType);

  return filteredConnectorTypes.map((type) => withSpecFields(context, type)) as ConnectorType[];
}
