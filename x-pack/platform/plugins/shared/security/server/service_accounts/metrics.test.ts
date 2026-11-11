/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import type { Meter } from '@opentelemetry/api';

import { UIAM_ERROR_CODES } from '@kbn/core-security-server';

import { ServiceAccountExchangeRefusedError } from './exchange_refused_error';
import {
  getOperationErrorType,
  getTokenExchangeErrorType,
  ServiceAccountsMetrics,
} from './metrics';
import { ServiceAccountTokenExchangeError } from './token_exchange_error';
import { securityMock } from '../mocks';

const createMeter = () => {
  const instruments = new Map<string, { add: jest.Mock; record: jest.Mock }>();
  const create = jest.fn((name: string) => {
    const instrument = { add: jest.fn(), record: jest.fn() };
    instruments.set(name, instrument);
    return instrument;
  });
  const meter = { createCounter: create, createHistogram: create } as unknown as Meter;
  const get = (name: string) => {
    const instrument = instruments.get(name);
    if (!instrument) {
      throw new Error(`No instrument named [${name}] was created`);
    }
    return instrument;
  };
  return { meter, get };
};

const exchangeError = (
  options: ConstructorParameters<typeof ServiceAccountTokenExchangeError>[1]
) => new ServiceAccountTokenExchangeError(new Error('upstream'), options);

describe('ServiceAccountsMetrics', () => {
  let meter: ReturnType<typeof createMeter>;
  let serviceAccountsMetrics: ServiceAccountsMetrics;

  beforeEach(() => {
    meter = createMeter();
    serviceAccountsMetrics = new ServiceAccountsMetrics(meter.meter);
  });

  it('names every instrument in the service accounts scope', () => {
    for (const name of [
      'kibana.security.service_accounts.operation.count',
      'kibana.security.service_accounts.create.rollback.failure.count',
      'kibana.security.service_accounts.token_exchange.count',
      'kibana.security.service_accounts.token_exchange.duration',
      'kibana.security.service_accounts.assume.count',
      'kibana.security.service_accounts.assume.duration',
    ]) {
      expect(meter.get(name)).toBeDefined();
    }
  });

  describe('#recordOperation', () => {
    const count = () => meter.get('kibana.security.service_accounts.operation.count').add;

    it('counts a successful operation without an error type', () => {
      serviceAccountsMetrics.recordOperation({ operation: 'create', backend: 'uiam' });

      expect(count()).toHaveBeenCalledWith(1, {
        'kibana.service_account.operation': 'create',
        'kibana.service_account.backend': 'uiam',
        outcome: 'success',
      });
    });

    it('counts a failed workload operation with its workload type and error type', () => {
      serviceAccountsMetrics.recordOperation({
        operation: 'workload_bind',
        backend: 'stack',
        errorType: '403',
        workload: { pluginId: 'workflowsExecutionEngine', workloadType: 'workflow' },
      });

      expect(count()).toHaveBeenCalledWith(1, {
        'kibana.service_account.operation': 'workload_bind',
        'kibana.service_account.backend': 'stack',
        'kibana.plugin.id': 'workflowsExecutionEngine',
        'kibana.service_account.workload.type': 'workflow',
        outcome: 'failure',
        'error.type': '403',
      });
    });
  });

  it('counts a rollback failure by the resource left behind', () => {
    serviceAccountsMetrics.recordRollbackFailure('credential');

    expect(
      meter.get('kibana.security.service_accounts.create.rollback.failure.count').add
    ).toHaveBeenCalledWith(1, { 'kibana.service_account.rollback.resource': 'credential' });
  });

  describe('#measureTokenExchange', () => {
    const count = () => meter.get('kibana.security.service_accounts.token_exchange.count').add;
    const duration = () =>
      meter.get('kibana.security.service_accounts.token_exchange.duration').record;

    it('resolves with the exchange and records a success', async () => {
      await expect(
        serviceAccountsMetrics.measureTokenExchange({ backend: 'uiam', trigger: 'initial' }, () =>
          Promise.resolve('token')
        )
      ).resolves.toBe('token');

      const attributes = {
        'kibana.service_account.backend': 'uiam',
        'kibana.service_account.token_exchange.trigger': 'initial',
        outcome: 'success',
      };
      expect(count()).toHaveBeenCalledWith(1, attributes);
      expect(duration()).toHaveBeenCalledWith(expect.any(Number), attributes);
    });

    it('rejects with the exchange failure and records what upstream answered', async () => {
      const error = exchangeError({
        retryable: false,
        statusCode: 403,
        errorCode: UIAM_ERROR_CODES.ORGANIZATION_SERVICE_ACCOUNT_REVOKED,
      });

      await expect(
        serviceAccountsMetrics.measureTokenExchange(
          { backend: 'uiam', trigger: 'reauthenticate' },
          () => Promise.reject(error)
        )
      ).rejects.toBe(error);

      const attributes = {
        'kibana.service_account.backend': 'uiam',
        'kibana.service_account.token_exchange.trigger': 'reauthenticate',
        outcome: 'failure',
        'error.type': 'account_revoked',
        'http.response.status_code': 403,
        'kibana.service_account.token_exchange.retryable': false,
        'kibana.uiam.error.code': UIAM_ERROR_CODES.ORGANIZATION_SERVICE_ACCOUNT_REVOKED,
      };
      expect(count()).toHaveBeenCalledWith(1, attributes);
      expect(duration()).toHaveBeenCalledWith(expect.any(Number), attributes);
    });

    it('records an error code UIAM is not known to send as other', async () => {
      await expect(
        serviceAccountsMetrics.measureTokenExchange({ backend: 'uiam', trigger: 'initial' }, () =>
          Promise.reject(exchangeError({ retryable: false, statusCode: 400, errorCode: '0xNEW' }))
        )
      ).rejects.toThrow();

      expect(count()).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ 'kibana.uiam.error.code': '_OTHER' })
      );
    });

    it('records the reason and status of a refusal Kibana made in place of the exchange', async () => {
      await expect(
        serviceAccountsMetrics.measureTokenExchange(
          { backend: 'stack', trigger: 'self_call' },
          () =>
            Promise.reject(
              new ServiceAccountExchangeRefusedError(
                'account_not_found',
                'missing stored credential',
                404
              )
            )
        )
      ).rejects.toThrow('missing stored credential');

      expect(count()).toHaveBeenCalledWith(1, {
        'kibana.service_account.backend': 'stack',
        'kibana.service_account.token_exchange.trigger': 'self_call',
        outcome: 'failure',
        'error.type': 'account_not_found',
        'http.response.status_code': 404,
      });
    });
  });

  describe('#startAssume', () => {
    const count = () => meter.get('kibana.security.service_accounts.assume.count').add;
    const duration = () => meter.get('kibana.security.service_accounts.assume.duration').record;
    const workload = { pluginId: 'agentBuilder', workloadType: 'agent' };

    it('records a success once', () => {
      const attempt = serviceAccountsMetrics.startAssume({ backend: 'uiam', workload });
      attempt.succeeded();
      attempt.failed('binding_not_found');

      const attributes = {
        'kibana.service_account.backend': 'uiam',
        'kibana.plugin.id': 'agentBuilder',
        'kibana.service_account.workload.type': 'agent',
        outcome: 'success',
      };
      expect(count()).toHaveBeenCalledTimes(1);
      expect(count()).toHaveBeenCalledWith(1, attributes);
      expect(duration()).toHaveBeenCalledTimes(1);
      expect(duration()).toHaveBeenCalledWith(expect.any(Number), attributes);
    });

    it('keeps the first reason a failure was reported with', () => {
      const attempt = serviceAccountsMetrics.startAssume({ backend: 'uiam', workload });
      attempt.failed('account_mismatch');
      attempt.failed('binding_integrity');

      expect(count()).toHaveBeenCalledTimes(1);
      expect(count()).toHaveBeenCalledWith(1, {
        'kibana.service_account.backend': 'uiam',
        'kibana.plugin.id': 'agentBuilder',
        'kibana.service_account.workload.type': 'agent',
        outcome: 'failure',
        'error.type': 'account_mismatch',
      });
    });
  });
});

describe('getTokenExchangeErrorType', () => {
  it.each([
    [UIAM_ERROR_CODES.ORGANIZATION_SERVICE_ACCOUNT_NOT_FOUND, 'account_not_found'],
    [UIAM_ERROR_CODES.ORGANIZATION_SERVICE_ACCOUNT_REVOKED, 'account_revoked'],
    [UIAM_ERROR_CODES.AUTHZ_DENY, 'account_access_denied'],
  ])('names the account reason for UIAM error code %s', (errorCode, errorType) => {
    expect(
      getTokenExchangeErrorType(exchangeError({ retryable: false, statusCode: 403, errorCode }))
    ).toBe(errorType);
  });

  it('tells a failure that may pass on a retry from a rejection', () => {
    expect(getTokenExchangeErrorType(exchangeError({ retryable: true, statusCode: 503 }))).toBe(
      'exchange_unavailable'
    );
    expect(getTokenExchangeErrorType(exchangeError({ retryable: false, statusCode: 400 }))).toBe(
      'exchange_rejected'
    );
  });

  it.each([
    'account_id_invalid',
    'account_not_found',
    'account_replaced',
    'credential_integrity',
    'security_disabled',
    'encryption_unavailable',
  ] as const)('names the reason Kibana refused with: %s', (refusal) => {
    expect(
      getTokenExchangeErrorType(new ServiceAccountExchangeRefusedError(refusal, 'refused', 403))
    ).toBe(refusal);
  });

  it('classifies a client error Kibana raised without a reason as a refusal, and anything else as other', () => {
    expect(getTokenExchangeErrorType(Boom.forbidden())).toBe('exchange_refused');
    expect(getTokenExchangeErrorType(Boom.internal())).toBe('_OTHER');
    expect(getTokenExchangeErrorType(new Error('unexpected'))).toBe('_OTHER');
  });
});

describe('getOperationErrorType', () => {
  it('names the status of a Boom error', () => {
    expect(getOperationErrorType(Boom.conflict())).toBe('409');
  });

  it('names the status of an Elasticsearch error', () => {
    const error = new errors.ResponseError(
      securityMock.createApiResponse({ statusCode: 409, body: { error: 'conflict' } })
    );
    expect(getOperationErrorType(error)).toBe('409');
  });

  it.each([
    ['a transport failure', new errors.ConnectionError('disconnected')],
    ['an error with no status', new Error('unexpected')],
    ['a value that is not an error', 'unexpected'],
    ['no value', undefined],
  ])('classifies %s as other', (_, error) => {
    expect(getOperationErrorType(error)).toBe('_OTHER');
  });
});
