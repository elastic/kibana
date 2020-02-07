/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocCount } from '../../../common/graphql/types';
import { INDEX_NAMES } from '../../../common/constants';
import { UMElasticsearchQueryFn } from '../adapters';

export const getDocCount: UMElasticsearchQueryFn<{}, DocCount> = async ({ callES }) => {
  const { count } = await callES('count', { index: INDEX_NAMES.HEARTBEAT });

  return { count };
};
