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
import { VERDICTS_DATA_STREAM, type StoredVerdict, type verdictsMappings } from './data_stream';

export interface Verdict {
  '@timestamp': string;
  verdict: string;
  verdict_id: string;
  discovery_id: string;
  discovery_slug: string;
  title: string;
}

const VERDICT_FIELDS: ReadonlyArray<keyof Verdict & string> = [
  '@timestamp',
  'verdict',
  'verdict_id',
  'discovery_id',
  'discovery_slug',
  'title',
];

export type VerdictDataStreamClient = IDataStreamClient<typeof verdictsMappings, StoredVerdict>;

export class VerdictClient {
  constructor(
    private readonly clients: {
      dataStreamClient: VerdictDataStreamClient;
      esClient: ElasticsearchClient;
      space: string;
    }
  ) {}

  async bulkCreate(verdicts: Verdict[]) {
    return this.clients.dataStreamClient.create({
      space: this.clients.space,
      documents: verdicts,
    });
  }

  async find(options: CommonSearchOptions = {}): Promise<{ hits: Verdict[] }> {
    return runLatestEsqlQuery<Verdict>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: VERDICTS_DATA_STREAM,
      fields: VERDICT_FIELDS,
      stats: (query) => query.pipe`STATS @timestamp = MAX(@timestamp),
              verdict = LATEST(verdict),
              discovery_id = LATEST(discovery_id),
              discovery_slug = LATEST(discovery_slug),
              title = LATEST(\`title.keyword\`)
          BY verdict_id`,
    });
  }
}
