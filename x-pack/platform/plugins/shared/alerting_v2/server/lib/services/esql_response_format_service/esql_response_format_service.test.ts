/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { FeatureFlagsStart } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { ESQL_RESPONSE_FORMAT_FEATURE_FLAG } from '../../../../common/feature_flags';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { createLoggerService } from '../logger_service/logger_service.mock';
import { arrowFormat } from '../query_service/formats/arrow_format';
import { jsonFormat } from '../query_service/formats/json_format';
import { EsqlResponseFormatService } from './esql_response_format_service';

const setup = (flagValue$: BehaviorSubject<string>) => {
  const { loggerService, mockLogger } = createLoggerService();
  const featureFlags = coreMock.createStart().featureFlags as jest.Mocked<FeatureFlagsStart>;
  featureFlags.getStringValue$.mockReturnValue(flagValue$);

  const service = new EsqlResponseFormatService(featureFlags, loggerService);

  return { service, featureFlags, mockLogger };
};

describe('EsqlResponseFormatService', () => {
  it('subscribes to the response format flag with the default format as fallback', () => {
    const { featureFlags } = setup(new BehaviorSubject('json'));

    expect(featureFlags.getStringValue$).toHaveBeenCalledWith(
      ESQL_RESPONSE_FORMAT_FEATURE_FLAG,
      'json'
    );
  });

  it('resolves the format the flag names', () => {
    const { service } = setup(new BehaviorSubject('arrow'));

    expect(service.get()).toBe(arrowFormat);
  });

  it('picks up a later rollout change', () => {
    const flagValue$ = new BehaviorSubject('json');
    const { service } = setup(flagValue$);

    expect(service.get()).toBe(jsonFormat);

    flagValue$.next('arrow');

    expect(service.get()).toBe(arrowFormat);
  });

  it('falls back to the default format and warns on an unregistered variation', () => {
    const { service, mockLogger } = setup(new BehaviorSubject('csv'));

    expect(service.get()).toBe(jsonFormat);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unknown ES|QL response format "csv"'),
      {
        labels: {
          resource: 'csv',
          code: ALERTING_LOG_CODES.QUERY_ESQL_RESPONSE_FORMAT_UNKNOWN,
        },
      }
    );
  });

  it('recovers when a bad variation is corrected', () => {
    const flagValue$ = new BehaviorSubject('csv');
    const { service } = setup(flagValue$);

    expect(service.get()).toBe(jsonFormat);

    flagValue$.next('arrow');

    expect(service.get()).toBe(arrowFormat);
  });
});
