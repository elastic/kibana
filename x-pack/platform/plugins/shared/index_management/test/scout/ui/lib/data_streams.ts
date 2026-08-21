/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';

// Seeds a data stream backed by its own index template, with an explicit lifecycle so the data
// lifecycle flyout has something to edit.
export const createDataStream = async (esClient: EsClient, name: string) => {
  await esClient.indices.putIndexTemplate({
    name: `${name}_index_template`,
    index_patterns: [name],
    data_stream: {},
    template: {
      mappings: { properties: { '@timestamp': { type: 'date' } } },
      lifecycle: { enabled: true },
    },
  });
  await esClient.indices.createDataStream({ name });
};

export const deleteDataStream = async (
  esClient: EsClient,
  name: string,
  templateName = `${name}_index_template`
) => {
  await esClient.indices.deleteDataStream({ name }, { ignore: [404] });
  await esClient.indices.deleteIndexTemplate({ name: templateName }, { ignore: [404] });
};
