/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeBuilder } from '@kbn/es-query';
import type { UserConnectorToken } from '../../types';
import { USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE } from '../../constants/saved_objects';
import type { SavedObjectClientForFind } from './types/params';
import { MAX_ACTIONS_RETURNED } from './constants';

interface GetUserTokenConnectorsSoParams {
  savedObjectsClient: SavedObjectClientForFind;
  profileUid: string;
}

export interface GetUserTokenConnectorsSoResult {
  connectorIds: string[];
}

export const getUserTokenConnectorsSo = async ({
  savedObjectsClient,
  profileUid,
}: GetUserTokenConnectorsSoParams): Promise<GetUserTokenConnectorsSoResult> => {
  const result = await savedObjectsClient.find<UserConnectorToken>({
    perPage: MAX_ACTIONS_RETURNED,
    type: USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
    fields: ['connectorId'],
    filter: nodeBuilder.is(
      `${USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.profileUid`,
      profileUid
    ),
  });

  return {
    connectorIds: result.saved_objects.map((so) => {
      return so.attributes.connectorId;
    }),
  };
};
