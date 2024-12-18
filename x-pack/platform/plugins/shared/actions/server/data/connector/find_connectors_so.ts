/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindConnectorsSoResult, FindConnectorsSoParams } from './types';
import { MAX_ACTIONS_RETURNED } from './constants';

export const findConnectorsSo = async ({
  savedObjectsClient,
  namespace,
}: FindConnectorsSoParams): Promise<FindConnectorsSoResult> => {
  return savedObjectsClient.find({
    perPage: MAX_ACTIONS_RETURNED,
    type: 'action',
    ...(namespace ? { namespaces: [namespace] } : {}),
  });
};
