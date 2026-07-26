/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ruleNotifyWhen = {
  CHANGE: 'onActionGroupChange',
  ACTIVE: 'onActiveAlert',
  THROTTLE: 'onThrottleInterval',
} as const;

export const ruleLastRunOutcomeValues = {
  SUCCEEDED: 'succeeded',
  WARNING: 'warning',
  FAILED: 'failed',
} as const;

export const ruleExecutionStatusValues = {
  OK: 'ok',
  ACTIVE: 'active',
  ERROR: 'error',
  WARNING: 'warning',
  PENDING: 'pending',
  UNKNOWN: 'unknown',
} as const;

export const ruleExecutionStatusErrorReason = {
  READ: 'read',
  DECRYPT: 'decrypt',
  EXECUTE: 'execute',
  UNKNOWN: 'unknown',
  LICENSE: 'license',
  TIMEOUT: 'timeout',
  DISABLED: 'disabled',
  VALIDATE: 'validate',
} as const;

export const ruleExecutionStatusWarningReason = {
  MAX_EXECUTABLE_ACTIONS: 'maxExecutableActions',
  MAX_ALERTS: 'maxAlerts',
  MAX_QUEUED_ACTIONS: 'maxQueuedActions',
  EXECUTION: 'ruleExecution',
} as const;

export const MISSING_UIAM_API_KEY_TAG = i18n.translate('xpack.alerting.missingUiamApiKeyTag', {
  defaultMessage: 'Missing Universal Api Key',
});

/**
 * Feature flag for provisioning UIAM API keys for alerting rules
 */
export const PROVISION_UIAM_API_KEYS_FEATURE_FLAG = 'alerting.rules.provisionUiamApiKeys';
