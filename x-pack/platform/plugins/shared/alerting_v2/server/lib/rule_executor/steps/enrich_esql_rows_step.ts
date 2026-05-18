/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { inject, injectable } from 'inversify';

import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { getRuleExecutionRowEnricher } from '../row_enrichment/register_row_enricher';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { ScopedClusterClientToken } from '../../services/es_service/scoped_cluster_tokens';
import { guardedMapStep } from '../stream_utils';

@injectable()
export class EnrichEsqlRowsStep implements RuleExecutionStep {
  public readonly name = 'enrich_esql_rows';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(ScopedClusterClientToken) private readonly scopedClusterClient: IScopedClusterClient
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    return guardedMapStep(streamState, ['rule', 'esqlRowBatch'], async (state) => {
      const enricher = getRuleExecutionRowEnricher();
      if (!enricher || state.esqlRowBatch.length === 0) {
        return { type: 'continue', state };
      }

      if (state.input.executionContext.signal.aborted) {
        return { type: 'continue', state };
      }

      this.logger.debug({
        message: () =>
          `[${this.name}] Running row enricher for rule ${state.input.ruleId} (${state.esqlRowBatch.length} rows)`,
      });

      try {
        const enrichedRows = await enricher({
          rule: state.rule,
          spaceId: state.input.spaceId,
          rows: state.esqlRowBatch,
          executionContext: state.input.executionContext,
          scopedClusterClient: this.scopedClusterClient,
        });

        return {
          type: 'continue',
          state: {
            ...state,
            esqlRowBatch: [...enrichedRows],
          },
        };
      } catch (error) {
        this.logger.error({
          error: error instanceof Error ? error : new Error(String(error)),
        });
        return { type: 'continue', state };
      }
    });
  }
}
