/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';

export interface TestEsqlView {
  name: string;
  query: string;
  description?: string;
}

export const createEsqlView = async (
  esClient: EsClient,
  { name, query, description }: TestEsqlView
): Promise<void> => {
  await esClient.transport.request({
    method: 'PUT',
    path: `/_query/view/${encodeURIComponent(name)}`,
    body: { query, description },
  });
};

export const getEsqlView = async (
  esClient: EsClient,
  name: string
): Promise<TestEsqlView | undefined> => {
  const { views } = await esClient.esql.getView({ name }, { ignore: [404] });
  return views?.[0];
};

export const deleteEsqlViews = async (esClient: EsClient, names: string[]): Promise<void> => {
  await Promise.all(names.map((name) => esClient.esql.deleteView({ name }, { ignore: [404] })));
};
