/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { FeatureFlagsStart } from '@kbn/core/server';
import { CoreStart } from '@kbn/core-di-server';
import { ESQL_RESPONSE_FORMAT_FEATURE_FLAG } from '../../../../common/feature_flags';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { LoggerServiceContract } from '../logger_service/logger_service';
import { LoggerServiceToken } from '../logger_service/logger_service';
import type { EsqlResponseFormat } from '../query_service/formats';
import {
  DEFAULT_ESQL_RESPONSE_FORMAT,
  ESQL_RESPONSE_FORMAT_NAMES,
  findEsqlResponseFormat,
} from '../query_service/formats';

export interface EsqlResponseFormatServiceContract {
  /**
   * The ES|QL response format the rule executor must use right now. Reads are
   * synchronous so a single execution resolves the transport and the row cap it
   * implies from the same value, and the `LIMIT` it appends can never disagree
   * with the path the query actually takes.
   */
  get(): EsqlResponseFormat;
}

/**
 * Resolves the ES|QL response format from the `alertingV2.esqlResponseFormat`
 * feature flag.
 *
 * The observable evaluation API is used rather than the one-shot getter: the
 * flag provider initializes asynchronously, so a single `getStringValue` call
 * can return the fallback before the provider is ready and would never pick up
 * a later rollout change.
 */
@injectable()
export class EsqlResponseFormatService implements EsqlResponseFormatServiceContract {
  private format: EsqlResponseFormat = DEFAULT_ESQL_RESPONSE_FORMAT;

  constructor(
    @inject(CoreStart('featureFlags')) featureFlags: FeatureFlagsStart,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {
    // Core exposes no plugin-stop hook to the DI container, so the subscription
    // intentionally lives for the lifetime of the process.
    featureFlags
      .getStringValue$(ESQL_RESPONSE_FORMAT_FEATURE_FLAG, DEFAULT_ESQL_RESPONSE_FORMAT.name)
      .subscribe((name) => {
        this.format = this.resolveFormat(name);
      });
  }

  public get(): EsqlResponseFormat {
    return this.format;
  }

  private resolveFormat(name: string): EsqlResponseFormat {
    const format = findEsqlResponseFormat(name);

    if (format) {
      return format;
    }

    this.logger.warn({
      message: `Unknown ES|QL response format "${name}" from the ${ESQL_RESPONSE_FORMAT_FEATURE_FLAG} feature flag; falling back to "${
        DEFAULT_ESQL_RESPONSE_FORMAT.name
      }". Registered formats: ${ESQL_RESPONSE_FORMAT_NAMES.join(', ')}`,
      code: ALERTING_LOG_CODES.QUERY_ESQL_RESPONSE_FORMAT_UNKNOWN,
      labels: { resource: name },
    });

    return DEFAULT_ESQL_RESPONSE_FORMAT;
  }
}
