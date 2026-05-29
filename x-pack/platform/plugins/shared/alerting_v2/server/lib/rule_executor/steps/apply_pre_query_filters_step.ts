/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core/server';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { guardedMapStep } from '../stream_utils';
import {
  PreQueryFilterRegistryToken,
  type PreQueryFilterRegistry,
} from '../pre_query_filter_registry';

/**
 * Invokes all registered pre-query filter providers (e.g. exception lists from
 * Security Solution) and composes their DSL filters into
 * `state.exceptionFilter` for consumption by `ExecuteRuleQueryStep`.
 *
 * This step does not import any solution-specific packages — the actual
 * filter-building logic lives in the provider callbacks registered via
 * `alertingV2.registerPreQueryFilterProvider()` during plugin setup.
 */
@injectable()
export class ApplyPreQueryFiltersStep implements RuleExecutionStep {
  public readonly name = 'apply_pre_query_filters';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(PreQueryFilterRegistryToken) private readonly registry: PreQueryFilterRegistry,
    @inject(Request) private readonly request: KibanaRequest
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return guardedMapStep(streamState, ['rule'], async (state) => {
      const { input, rule } = state;
      const providers = step.registry.getProviders();

      if (providers.length === 0) {
        return { type: 'continue', state };
      }

      step.logger.debug({
        message: `[${step.name}] Running ${providers.length} pre-query filter provider(s) for rule ${input.ruleId}`,
      });

      const filters: QueryDslQueryContainer[] = [];

      for (const { name, provider } of providers) {
        try {
          const filter = await provider({ rule, request: step.request });

          if (filter != null) {
            filters.push(filter);
            step.logger.debug({
              message: `[${step.name}] Provider "${name}" returned a filter for rule ${input.ruleId}`,
            });
          }
        } catch (e) {
          step.logger.warn({
            message: `[${step.name}] Provider "${name}" failed for rule ${input.ruleId}: ${e.message}`,
          });
        }
      }

      if (filters.length === 0) {
        return { type: 'continue', state };
      }

      const composedFilter: QueryDslQueryContainer =
        filters.length === 1
          ? filters[0]
          : { bool: { filter: filters } };

      return {
        type: 'continue',
        state: {
          ...state,
          exceptionFilter: composedFilter,
        },
      };
    });
  }
}
