/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TEMPORARY perf-test scaffolding — do not merge / not for production.
 *
 * Creates a source index and bulk-indexes wide (~5KB/row) documents so that an
 * ES|QL breach query (`FROM <index> | KEEP @timestamp, host.name, message`)
 * returns ~10,000 rows / ~50MB per run. Used to validate the alerting v2 ES|QL
 * streaming approach under saturation. Hit from Dev Tools:
 *
 *   POST kbn:/internal/alerting/v2/_perf/generate_data
 *   { "docCount": 50000, "rowSizeBytes": 5000 }
 *
 * Remove this file and its `bind(Route)` entry in `server/setup/bind_routes.ts`
 * before merging.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import { z } from '@kbn/zod/v4';

import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { EsServiceScopedToken } from '../../lib/services/es_service/tokens';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';

const GENERATE_DATA_API_PATH = '/internal/alerting/v2/_perf/generate_data';

const generateDataBodySchema = z.object({
  index: z.string().min(1).default('perf-esql-source'),
  docCount: z.number().int().min(1).max(5_000_000).default(50_000),
  rowSizeBytes: z.number().int().min(1).max(32_000).default(5_000),
  batchSize: z.number().int().min(1).max(10_000).default(2_000),
  recreate: z.boolean().default(false),
});

type GenerateDataBody = z.infer<typeof generateDataBodySchema>;

interface PerfSourceDoc {
  '@timestamp': string;
  host: { name: string };
  message: string;
}

@injectable()
export class GenerateDataRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = GENERATE_DATA_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    access: 'internal',
    summary: 'Generate ES|QL perf-test source data (temporary)',
  } as const;
  static schemas = {
    request: {
      body: generateDataBodySchema,
    },
  };

  protected readonly routeName = 'generate perf data';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request) private readonly request: KibanaRequest<unknown, unknown, GenerateDataBody>,
    @inject(EsServiceScopedToken) private readonly esClient: ElasticsearchClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { index, docCount, rowSizeBytes, batchSize, recreate } = this.request.body;
    const startedAt = Date.now();

    await this.ensureIndex(index, recreate);
    const { indexed, failed } = await this.bulkIndex(index, docCount, rowSizeBytes, batchSize);

    return this.ctx.response.ok({
      body: {
        index,
        requested: docCount,
        indexed,
        failed,
        rowSizeBytes,
        tookMs: Date.now() - startedAt,
      },
    });
  }

  private async ensureIndex(index: string, recreate: boolean): Promise<void> {
    const exists = await this.esClient.indices.exists({ index });

    if (exists && recreate) {
      await this.esClient.indices.delete({ index });
    }

    if (!exists || recreate) {
      await this.esClient.indices.create({
        index,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
        },
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            host: { properties: { name: { type: 'keyword' } } },
            // ignore_above kept below Lucene's 32766-byte term limit so the
            // ~5KB value is stored in doc values and readable by ES|QL.
            message: { type: 'keyword', ignore_above: 32766 },
          },
        },
      });
    }
  }

  private async bulkIndex(
    index: string,
    docCount: number,
    rowSizeBytes: number,
    batchSize: number
  ): Promise<{ indexed: number; failed: number }> {
    const message = 'x'.repeat(rowSizeBytes);
    const now = Date.now();

    const makeDocs = async function* (): AsyncGenerator<PerfSourceDoc> {
      for (let i = 0; i < docCount; i++) {
        yield {
          // Spread timestamps across the last hour; a large rule lookback keeps
          // them all inside the query window for the whole test run.
          '@timestamp': new Date(now - (i % 3_600_000)).toISOString(),
          host: { name: `host-${i % 1000}` },
          message,
        };
      }
    };

    const result = await this.esClient.helpers.bulk<PerfSourceDoc>({
      datasource: makeDocs(),
      flushBytes: Math.max(batchSize * (rowSizeBytes + 128), 1_000_000),
      concurrency: 4,
      onDocument: () => ({ index: { _index: index } }),
      refreshOnCompletion: index,
    });

    return { indexed: result.successful, failed: result.failed };
  }
}
