/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { StatesIndexStatus } from '../../../common/graphql/types';
import { INDEX_NAMES } from '../../../common/constants';

export const getIndexStatus: UMElasticsearchQueryFn<{}, StatesIndexStatus> = async ({ callES }) => {
  const {
    _shards: { total },
    count,
  } = await callES('count', { index: INDEX_NAMES.HEARTBEAT });
  return {
    indexExists: total > 0,
    docCount: {
      count,
    },
  };
};
