/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  type Attributes,
  type Counter,
  type Histogram,
  type Meter,
  metrics,
  ValueType,
} from '@opentelemetry/api';

import { UIAM_ERROR_CODES } from '@kbn/core-security-server';

import type { ServiceAccountExchangeRefusal } from './exchange_refused_error';
import { ServiceAccountExchangeRefusedError } from './exchange_refused_error';
import { ServiceAccountTokenExchangeError } from './token_exchange_error';
import { getErrorStatusCode } from '../errors';

/**
 * Scope of every service account metric. Core's workload resolution metrics use the same scope, so
 * one filter on `scope.name` finds them all.
 */
export const SERVICE_ACCOUNTS_METER_NAME = 'kibana.security.service_accounts';

/** Which backend served the call. The two are mutually exclusive per deployment. */
export type ServiceAccountsBackendType = 'stack' | 'uiam';

/** A change to an account or to a workload binding. */
export type ServiceAccountOperation = 'create' | 'delete' | 'workload_bind' | 'workload_unbind';

/**
 * Why a token exchange ran. `initial` is the mint that creates a bound request, `reauthenticate` a
 * re-mint after Elasticsearch or a Kibana self call answered 401, and `self_call` a refresh before a
 * Kibana self call that would outlive the current token.
 */
export type ServiceAccountTokenExchangeTrigger = 'initial' | 'reauthenticate' | 'self_call';

/** Which resource a failed create could not roll back, and so left behind. */
export type ServiceAccountRollbackResource = 'token' | 'account' | 'credential';

/**
 * Why a workload could not assume its service account. The binding reasons are decided before any
 * credential is minted. The rest come from the first mint, see {@link getTokenExchangeErrorType}.
 */
export type ServiceAccountAssumeErrorType =
  | 'unavailable'
  | 'binding_not_found'
  | 'binding_integrity'
  | 'account_mismatch'
  | ServiceAccountTokenExchangeErrorType;

/** UIAM's answers about the account itself, keyed by its error code in `UIAM_ACCOUNT_ERROR_TYPES`. */
type UiamAccountErrorType = 'account_not_found' | 'account_revoked' | 'account_access_denied';

/**
 * An upstream failure with no more specific reason. `exchange_unavailable` may pass on a retry,
 * `exchange_rejected` will not.
 */
type UpstreamErrorType = 'exchange_unavailable' | 'exchange_rejected';

/**
 * Why a token exchange failed, grouped by who decided it:
 *
 * - {@link UiamAccountErrorType}: UIAM, about the account.
 * - {@link ServiceAccountExchangeRefusal}: Kibana, before it called upstream. `account_not_found`
 *   is in both groups, because Kibana holding no credential means the same as UIAM knowing no
 *   account.
 * - {@link UpstreamErrorType}: upstream, with no more specific reason.
 * - `exchange_refused`: a client error Kibana raised without a refusal reason. Every refusal Kibana
 *   makes has one, so this marks a new refusal that still needs one.
 * - `_OTHER`: anything else.
 */
export type ServiceAccountTokenExchangeErrorType =
  | UiamAccountErrorType
  | ServiceAccountExchangeRefusal
  | UpstreamErrorType
  | 'exchange_refused'
  | '_OTHER';

/**
 * Seconds, with more boundaries between 50 and 500ms, where most exchanges fall, and a long tail
 * for an upstream that is slow to answer.
 */
const DURATION_BUCKET_BOUNDARIES = [
  0.01, 0.025, 0.05, 0.075, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.65, 0.8, 1, 1.5, 2, 3, 5, 7.5,
  10, 20,
];

const UIAM_ACCOUNT_ERROR_TYPES: Readonly<Record<string, UiamAccountErrorType>> = {
  [UIAM_ERROR_CODES.ORGANIZATION_SERVICE_ACCOUNT_NOT_FOUND]: 'account_not_found',
  [UIAM_ERROR_CODES.ORGANIZATION_SERVICE_ACCOUNT_REVOKED]: 'account_revoked',
  [UIAM_ERROR_CODES.AUTHZ_DENY]: 'account_access_denied',
};

/**
 * The UIAM error codes recorded as they are. Any other code is recorded as `_OTHER`, so an
 * unexpected answer from UIAM cannot grow the attribute's cardinality.
 */
const KNOWN_UIAM_ERROR_CODES: ReadonlySet<string> = new Set(Object.values(UIAM_ERROR_CODES));

/** Classifies a failed token exchange, or a refusal Kibana made in its place. */
export const getTokenExchangeErrorType = (error: unknown): ServiceAccountTokenExchangeErrorType => {
  if (error instanceof ServiceAccountTokenExchangeError) {
    const accountErrorType =
      error.errorCode !== undefined ? UIAM_ACCOUNT_ERROR_TYPES[error.errorCode] : undefined;
    if (accountErrorType) {
      return accountErrorType;
    }
    return error.retryable ? 'exchange_unavailable' : 'exchange_rejected';
  }

  if (error instanceof ServiceAccountExchangeRefusedError) {
    return error.refusal;
  }

  if (Boom.isBoom(error) && error.output.statusCode < 500) {
    return 'exchange_refused';
  }

  return '_OTHER';
};

/**
 * The upstream status of a failed exchange, or the status of a refusal Kibana made in its place.
 * `undefined` when there was neither, such as a transport failure.
 */
const getStatusCode = (error: unknown): number | undefined => {
  if (error instanceof ServiceAccountTokenExchangeError) {
    return error.statusCode;
  }
  return Boom.isBoom(error) ? error.output.statusCode : undefined;
};

/**
 * The error type of a failed operation: its HTTP status when it has one, otherwise `_OTHER`. Reads
 * the status of Elasticsearch errors too, which the stack backend lets through unwrapped.
 */
export const getOperationErrorType = (error: unknown): string => {
  const statusCode =
    typeof error === 'object' && error !== null ? getErrorStatusCode(error) : undefined;
  return typeof statusCode === 'number' ? String(statusCode) : '_OTHER';
};

interface OperationParams {
  operation: ServiceAccountOperation;
  backend: ServiceAccountsBackendType;
  /** Absent on success. */
  errorType?: string;
  /** Set for the workload operations only. */
  workload?: WorkloadAttributes;
}

interface WorkloadAttributes {
  pluginId: string;
  workloadType: string;
}

interface TokenExchangeParams {
  backend: ServiceAccountsBackendType;
  trigger: ServiceAccountTokenExchangeTrigger;
}

interface AssumeParams {
  backend: ServiceAccountsBackendType;
  workload: WorkloadAttributes;
}

/**
 * The outcome of one workload's attempt to assume its service account. Only the first call counts,
 * so a failure can be reported where its reason is known and again, as a fallback, where it is
 * caught.
 */
export interface ServiceAccountAssumeAttempt {
  succeeded(): void;
  failed(errorType: ServiceAccountAssumeErrorType): void;
}

const toWorkloadAttributes = ({ pluginId, workloadType }: WorkloadAttributes): Attributes => ({
  'kibana.plugin.id': pluginId,
  'kibana.service_account.workload.type': workloadType,
});

const toOutcomeAttributes = (errorType: string | undefined): Attributes =>
  errorType === undefined
    ? { outcome: 'success' }
    : { outcome: 'failure', 'error.type': errorType };

/**
 * OpenTelemetry metrics for service accounts.
 *
 * Every attempt is counted on a counter, and timed attempts also on a histogram. The counter is what
 * a success-rate SLO sums. The histogram is recorded for failures too, so a percentile SLO should
 * filter on `outcome: "success"`: failures tend to return faster and would hide a slow upstream.
 *
 * Account, workload and execution IDs are never attributes. Plugin IDs and workload types are, since
 * plugins register a small, fixed set of them.
 */
export class ServiceAccountsMetrics {
  private readonly operationCount: Counter<Attributes>;
  private readonly rollbackFailureCount: Counter<Attributes>;
  private readonly tokenExchangeCount: Counter<Attributes>;
  private readonly tokenExchangeDuration: Histogram<Attributes>;
  private readonly assumeCount: Counter<Attributes>;
  private readonly assumeDuration: Histogram<Attributes>;

  constructor(meter: Meter = metrics.getMeter(SERVICE_ACCOUNTS_METER_NAME)) {
    this.operationCount = meter.createCounter('kibana.security.service_accounts.operation.count', {
      description:
        'Number of attempts to create or delete a service account, or to bind or unbind a ' +
        'workload, partitioned by operation and outcome.',
      unit: '{operation}',
      valueType: ValueType.INT,
    });

    this.rollbackFailureCount = meter.createCounter(
      'kibana.security.service_accounts.create.rollback.failure.count',
      {
        description:
          'Number of resources a failed service account create could not roll back, and so left ' +
          'behind for an operator to remove.',
        unit: '{resource}',
        valueType: ValueType.INT,
      }
    );

    this.tokenExchangeCount = meter.createCounter(
      'kibana.security.service_accounts.token_exchange.count',
      {
        description:
          'Number of attempts to exchange a service account for a short-lived token, partitioned ' +
          'by backend, trigger and outcome.',
        unit: '{exchange}',
        valueType: ValueType.INT,
      }
    );

    this.tokenExchangeDuration = meter.createHistogram(
      'kibana.security.service_accounts.token_exchange.duration',
      {
        description: 'Time a service account token exchange took, successful or not.',
        unit: 's',
        valueType: ValueType.DOUBLE,
        advice: { explicitBucketBoundaries: DURATION_BUCKET_BOUNDARIES },
      }
    );

    this.assumeCount = meter.createCounter('kibana.security.service_accounts.assume.count', {
      description:
        'Number of attempts by a workload to assume the service account it is bound to, ' +
        'partitioned by workload type and outcome.',
      unit: '{attempt}',
      valueType: ValueType.INT,
    });

    this.assumeDuration = meter.createHistogram(
      'kibana.security.service_accounts.assume.duration',
      {
        description:
          'Time from the start of an attempt to assume a service account until the workload has ' +
          'its first credential, or the attempt failed. Covers the binding check and the first ' +
          'token exchange.',
        unit: 's',
        valueType: ValueType.DOUBLE,
        advice: { explicitBucketBoundaries: DURATION_BUCKET_BOUNDARIES },
      }
    );
  }

  recordOperation({ operation, backend, errorType, workload }: OperationParams): void {
    this.operationCount.add(1, {
      'kibana.service_account.operation': operation,
      'kibana.service_account.backend': backend,
      ...(workload ? toWorkloadAttributes(workload) : {}),
      ...toOutcomeAttributes(errorType),
    });
  }

  recordRollbackFailure(resource: ServiceAccountRollbackResource): void {
    this.rollbackFailureCount.add(1, { 'kibana.service_account.rollback.resource': resource });
  }

  /** Runs one token exchange and records how it went. Resolves or rejects as the exchange does. */
  async measureTokenExchange<T>(
    { backend, trigger }: TokenExchangeParams,
    exchange: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    const record = (failure?: unknown) => {
      const attributes: Attributes = {
        'kibana.service_account.backend': backend,
        'kibana.service_account.token_exchange.trigger': trigger,
        ...toOutcomeAttributes(
          failure === undefined ? undefined : getTokenExchangeErrorType(failure)
        ),
      };
      if (failure !== undefined) {
        const statusCode = getStatusCode(failure);
        if (statusCode !== undefined) {
          attributes['http.response.status_code'] = statusCode;
        }
        if (failure instanceof ServiceAccountTokenExchangeError) {
          attributes['kibana.service_account.token_exchange.retryable'] = failure.retryable;
          if (failure.errorCode !== undefined) {
            attributes['kibana.uiam.error.code'] = KNOWN_UIAM_ERROR_CODES.has(failure.errorCode)
              ? failure.errorCode
              : '_OTHER';
          }
        }
      }
      this.tokenExchangeCount.add(1, attributes);
      this.tokenExchangeDuration.record((performance.now() - start) / 1000, attributes);
    };

    let result: T;
    try {
      result = await exchange();
    } catch (e) {
      // A rejection with no reason still counts as a failure.
      record(e ?? new Error('Service account token exchange failed.'));
      throw e;
    }
    record();
    return result;
  }

  /** Starts timing one workload's attempt to assume its service account. */
  startAssume({ backend, workload }: AssumeParams): ServiceAccountAssumeAttempt {
    const start = performance.now();
    let recorded = false;
    const record = (errorType?: ServiceAccountAssumeErrorType) => {
      if (recorded) {
        return;
      }
      recorded = true;
      const attributes: Attributes = {
        'kibana.service_account.backend': backend,
        ...toWorkloadAttributes(workload),
        ...toOutcomeAttributes(errorType),
      };
      this.assumeCount.add(1, attributes);
      this.assumeDuration.record((performance.now() - start) / 1000, attributes);
    };

    return {
      succeeded: () => record(),
      failed: (errorType) => record(errorType),
    };
  }
}

export const serviceAccountsMetrics = new ServiceAccountsMetrics();
