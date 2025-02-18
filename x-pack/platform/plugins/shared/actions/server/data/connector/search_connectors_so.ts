/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchConnectorsSoParams } from './types';

export const searchConnectorsSo = async ({
  esClient,
  kibanaIndices,
  aggs,
}: SearchConnectorsSoParams) => {
  return esClient.search({
    index: kibanaIndices,
    ignore_unavailable: true,
    body: {
      aggs,
      size: 0,
      query: {
        match_all: {},
      },
    },
  });
};
