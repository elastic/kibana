/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isEmpty } from 'lodash';

export interface EsqlView {
  name: string;
  query: string;
}

export interface EsqlViewResponse {
  views: EsqlView[];
}

export async function getEsqlView({
  esClient,
  logger,
  name,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  name: string;
}): Promise<EsqlView> {
  logger.debug(`Getting ES|QL view: ${name}`);

  const response = await esClient.transport.request<EsqlViewResponse>({
    method: 'GET',
    path: `/_query/view/${name}`,
  });

  if (isEmpty(response.views)) {
    throw new Error(`ES|QL view "${name}" not found.`);
  }

  return response.views[0];
}

export async function upsertEsqlView({
  esClient,
  logger,
  name,
  query,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  name: string;
  query: string;
}): Promise<void> {
  logger.debug(`Upserting ES|QL view: ${name}`);

  await esClient.transport.request({
    method: 'PUT',
    path: `/_query/view/${name}`,
    body: { query },
  });
}

export async function deleteEsqlView({
  esClient,
  logger,
  name,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  name: string;
}): Promise<void> {
  logger.debug(`Deleting ES|QL view: ${name}`);

  await esClient.transport.request(
    {
      method: 'DELETE',
      path: `/_query/view/${name}`,
    },
    {
      ignore: [404],
    }
  );
}
