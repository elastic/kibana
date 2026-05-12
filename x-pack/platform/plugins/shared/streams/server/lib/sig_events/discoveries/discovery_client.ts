/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import { esql } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import { andWhere } from '../esql_utils';
import { type CommonSearchOptions } from '../query_utils';
import { type LatestSourceWhereCondition, runLatestSourceEsqlQuery } from '../latest_source_query';
import {
  DISCOVERIES_DATA_STREAM,
  type Discovery,
  type StoredDiscovery,
  type discoveriesMappings,
} from './data_stream';

export type DiscoveryDataStreamClient = IDataStreamClient<
  typeof discoveriesMappings,
  StoredDiscovery
>;

export interface DiscoveriesSearchOptions extends CommonSearchOptions {
  kind?: 'finding' | 'clearance';
  discovery_id?: string;
  discovery_slug?: string[];
  closes?: string;
  was_grouped?: boolean;
  rule_names?: string[];
  stream_names?: string[];
  closed_by_execution_id?: string;
}

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

  async findLatest(options: DiscoveriesSearchOptions = {}): Promise<{ hits: Discovery[] }> {
    let where: LatestSourceWhereCondition | undefined;

    if (options.kind) {
      where = andWhere(where, esql.exp`${esql.col('kind')} == ${esql.str(options.kind)}`);
    }

    if (options.discovery_id) {
      where = andWhere(
        where,
        esql.exp`${esql.col('discovery_id')} == ${esql.str(options.discovery_id)}`
      );
    }

    if (options.discovery_slug?.length) {
      const discoverySlugLiterals = options.discovery_slug.map((discoverySlug) =>
        esql.str(discoverySlug)
      );
      where = andWhere(
        where,
        esql.exp`${esql.col('discovery_slug')} IN (${discoverySlugLiterals})`
      );
    }

    if (options.closes) {
      where = andWhere(where, esql.exp`${esql.col('closes')} == ${esql.str(options.closes)}`);
    }

    if (options.was_grouped === true) {
      where = andWhere(where, esql.exp`${esql.col('grouped_into')} IS NOT NULL`);
    }

    if (options.was_grouped === false) {
      where = andWhere(where, esql.exp`${esql.col('grouped_into')} IS NULL`);
    }

    if (options.rule_names?.length) {
      const ruleNamesLiterals = options.rule_names.map((ruleName) => esql.str(ruleName));
      where = andWhere(
        where,
        esql.exp`MV_INTERSECTS(${esql.col('rule_names')}, [${ruleNamesLiterals}])`
      );
    }

    if (options.stream_names?.length) {
      const streamNamesLiterals = options.stream_names.map((streamName) => esql.str(streamName));
      where = andWhere(
        where,
        esql.exp`MV_INTERSECTS(${esql.col('stream_names')}, [${streamNamesLiterals}])`
      );
    }

    if (options.closed_by_execution_id) {
      where = andWhere(
        where,
        esql.exp`${esql.col('closed_by_execution_id')} == ${esql.str(
          options.closed_by_execution_id
        )}`
      );
    }

    return runLatestSourceEsqlQuery<Discovery>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DISCOVERIES_DATA_STREAM,
      where,
      groupBy: 'discovery_id',
    });
  }
}
