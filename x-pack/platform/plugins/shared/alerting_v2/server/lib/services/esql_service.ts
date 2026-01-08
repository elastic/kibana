/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { ElasticsearchClient } from '@kbn/core-di';
import type { EsqlEsqlResult } from '@elastic/elasticsearch/lib/api/types';
import { LoggerService } from './logger_service';

interface ExecuteEsqlQueryParams {
  query: string;
}

@injectable()
export class EsqlService {
  constructor(
    @inject(ElasticsearchClient) private readonly esClient: ElasticsearchClient,
    @inject(LoggerService) private readonly logger: LoggerService
  ) {}

  async executeQuery({ query }: ExecuteEsqlQueryParams): Promise<EsqlEsqlResult> {
    try {
      this.logger.debug({ message: 'EsqlService: Executing ES|QL query' });

      const queryRequest = {
        query,
        drop_null_columns: false,
      };

      const response = await this.esClient.esql.query(queryRequest);

      this.logger.debug({
        message: `EsqlService: Query executed successfully, returned ${response.values.length} rows`,
      });

      return response;
    } catch (error) {
      this.logger.error({
        error,
        code: 'ESQL_QUERY_ERROR',
        type: 'EsqlServiceError',
      });

      throw error;
    }
  }

  public queryResponseToObject<T extends Record<string, any>>(response: EsqlEsqlResult): T[] {
    const objects: T[] = [];

    if (response.columns.length === 0 || response.values.length === 0) {
      return [];
    }

    for (const row of response.values) {
      const object: T = {} as T;

      for (const [columnIndex, value] of row.entries()) {
        const columnName = response.columns[columnIndex]?.name as keyof T;

        if (columnName) {
          object[columnName] = value as T[keyof T];
        }
      }

      objects.push(object);
    }

    return objects;
  }
}
