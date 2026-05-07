/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type CommonSearchOptions } from '../query_utils';
import { runLatestEsqlQuery } from '../latest_query';
import {
  DISCOVERIES_DATA_STREAM,
  type StoredDiscovery,
  type discoveriesMappings,
} from './data_stream';

export interface Discovery {
  '@timestamp': string;
  discovery_id: string;
  discovery_slug: string;
  status: string;
  title: string;
}

const DISCOVERY_FIELDS: ReadonlyArray<keyof Discovery & string> = [
  '@timestamp',
  'discovery_id',
  'discovery_slug',
  'status',
  'title',
];

export type DiscoveryDataStreamClient = IDataStreamClient<
  typeof discoveriesMappings,
  StoredDiscovery
>;

export class DiscoveryClient {
  constructor(
    private readonly clients: {
      dataStreamClient: DiscoveryDataStreamClient;
      esClient: ElasticsearchClient;
      space: string;
    }
  ) {}

  async bulkCreate(discoveries: Discovery[]) {
    return this.clients.dataStreamClient.create({
      space: this.clients.space,
      documents: discoveries,
    });
  }

  async find(options: CommonSearchOptions = {}): Promise<{ hits: Discovery[] }> {
    return runLatestEsqlQuery<Discovery>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DISCOVERIES_DATA_STREAM,
      fields: DISCOVERY_FIELDS,
      stats: (query) => query.pipe`STATS @timestamp = MAX(@timestamp),
              status = LATEST(status),
              discovery_slug = LATEST(discovery_slug),
              title = LATEST(\`title.keyword\`)
          BY discovery_id`,
    });
  }
}
