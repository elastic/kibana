/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attributes } from '@opentelemetry/api';
import { metrics, ValueType } from '@opentelemetry/api';

const meter = metrics.getMeter('kibana.actions');

export const connectorCreateCounter = meter.createCounter('kibana.actions.connector.create.count', {
  description: 'Connector creation attempts by connector type, auth type and outcome.',
  unit: '{connector}',
  valueType: ValueType.INT,
});

export const connectorExecuteCounter = meter.createCounter(
  'kibana.actions.connector.execute.count',
  {
    description: 'Connector execution attempts by connector type, sub-action and outcome.',
    unit: '{execution}',
    valueType: ValueType.INT,
  }
);

export const connectorExecuteDuration = meter.createHistogram(
  'kibana.actions.connector.execute.duration',
  {
    description: 'Duration of connector executions that reached the connector executor.',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
    advice: {
      explicitBucketBoundaries: [50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000],
    },
  }
);

export const connectorAuthCounter = meter.createCounter('kibana.actions.connector.auth.count', {
  description: 'Connector authentication attempts by auth type, phase and outcome.',
  unit: '{attempt}',
  valueType: ValueType.INT,
});

export type ConnectorCreateErrorType = 'conflict' | 'invalid' | 'unauthorized' | 'other';
export type ConnectorExecuteErrorType =
  | 'rate_limited'
  | 'invalid'
  | 'unauthorized'
  | 'auth_failed'
  | 'disabled'
  | 'other';
export type ConnectorAuthErrorType =
  | 'rate_limited'
  | 'invalid'
  | 'unauthorized'
  | 'provider_error'
  | 'user_mismatch'
  | 'token_request_failed'
  | 'authorization_failed'
  | 'other';

/** `initiate` starts the OAuth flow, `authorize` is the callback that completes it. */
export type ConnectorAuthPhase = 'initiate' | 'authorize' | 'token' | 'execute';

/** Who is responsible for a failed execution. */
export type ConnectorErrorSource = 'user' | 'framework';

const NO_AUTH_TYPE = 'none';
const UNKNOWN_LABEL = 'unknown';

/** Bounds a request-supplied label: values that aren't known to the server are reported as "unknown". */
export const toBoundedLabel = (value: string, isKnown: boolean): string =>
  isKnown ? value : UNKNOWN_LABEL;

/** Reads the auth type of a connector from its secrets, falling back to its config. */
export const getConnectorAuthType = ({
  config,
  secrets,
}: {
  config?: { authType?: unknown } | null;
  secrets?: { authType?: unknown } | null;
}): string => {
  const authType = secrets?.authType ?? config?.authType;
  return typeof authType === 'string' && authType.length > 0 ? authType : NO_AUTH_TYPE;
};

/** Maps an HTTP status carried by a thrown Boom error onto a connector create error type. */
export const getConnectorCreateErrorType = (error: unknown): ConnectorCreateErrorType => {
  const statusCode = (error as { output?: { statusCode?: number } } | undefined)?.output
    ?.statusCode;
  switch (statusCode) {
    case 400:
      return 'invalid';
    case 401:
    case 403:
      return 'unauthorized';
    case 409:
      return 'conflict';
    default:
      return 'other';
  }
};

/** Maps the HTTP status of a failed OAuth flow start onto a connector auth error type. */
export const getConnectorAuthInitiateErrorType = (statusCode: number): ConnectorAuthErrorType => {
  switch (statusCode) {
    case 400:
    case 404:
      return 'invalid';
    case 401:
    case 403:
      return 'unauthorized';
    case 429:
      return 'rate_limited';
    default:
      return 'other';
  }
};

export interface RecordConnectorCreateOpts {
  connectorType: string;
  authType: string;
  errorType?: ConnectorCreateErrorType;
}

export const recordConnectorCreate = ({
  connectorType,
  authType,
  errorType,
}: RecordConnectorCreateOpts): void => {
  connectorCreateCounter.add(1, {
    'connector.type': connectorType,
    'connector.auth_type': authType,
    success: errorType === undefined,
    ...(errorType ? { 'error.type': errorType } : {}),
  });
};

export interface RecordConnectorExecuteOpts {
  connectorType: string;
  subAction?: string;
  errorType?: ConnectorExecuteErrorType;
  errorSource?: ConnectorErrorSource;
  durationMs?: number;
}

export const recordConnectorExecute = ({
  connectorType,
  subAction,
  errorType,
  errorSource,
  durationMs,
}: RecordConnectorExecuteOpts): void => {
  const attributes: Attributes = {
    'connector.type': connectorType,
    ...(subAction ? { 'connector.sub_action': subAction } : {}),
    success: errorType === undefined,
    ...(errorType ? { 'error.type': errorType } : {}),
  };

  connectorExecuteCounter.add(1, {
    ...attributes,
    ...(errorType && errorSource ? { 'error.source': errorSource } : {}),
  });

  if (durationMs !== undefined) {
    connectorExecuteDuration.record(durationMs, attributes);
  }
};

export interface RecordConnectorAuthOpts {
  phase: ConnectorAuthPhase;
  authType: string;
  connectorType?: string;
  errorType?: ConnectorAuthErrorType;
}

export const recordConnectorAuth = ({
  phase,
  authType,
  connectorType,
  errorType,
}: RecordConnectorAuthOpts): void => {
  connectorAuthCounter.add(1, {
    'auth.phase': phase,
    'connector.auth_type': authType,
    ...(connectorType ? { 'connector.type': connectorType } : {}),
    success: errorType === undefined,
    ...(errorType ? { 'error.type': errorType } : {}),
  });
};
