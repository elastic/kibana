/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';

export const createDataStream = async (esClient: EsClient, name: string) => {
  await esClient.indices.putIndexTemplate({
    name,
    index_patterns: [name],
    data_stream: {},
    priority: 200,
    template: { mappings: { properties: { '@timestamp': { type: 'date' } } } },
  });
  await esClient.indices.createDataStream({ name });
};

export const deleteDataStream = async (esClient: EsClient, name: string) => {
  await esClient.indices.deleteDataStream({ name }, { ignore: [404] });
  await esClient.indices.deleteIndexTemplate({ name }, { ignore: [404] });
};
