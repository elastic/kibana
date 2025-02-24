/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ActionsClientContext } from '../../../../actions_client';
import { ConnectorType } from '../../types';
import { listTypesParamsSchema } from './schemas';
import { ListTypesParams } from './types';

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

  const connectorTypes = context.actionTypeRegistry.list(featureId);

  const filteredConnectorTypes = includeSystemActionTypes
    ? connectorTypes
    : connectorTypes.filter((type) => !Boolean(type.isSystemActionType));

  return filteredConnectorTypes;
}
