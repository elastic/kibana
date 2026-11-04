/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder, nodeTypes } from '@kbn/es-query';
import {
  API_KEY_AUTH_ERROR_CODES,
  LEGACY_MISSING_UIAM_API_KEY_TAG,
  MISSING_UIAM_API_KEY_TAG,
  RuleExecutionStatusErrorReasons,
} from '@kbn/alerting-plugin/common';

export type RuleHealthSelection =
  /** Every rule that needs attention: failed, warning, or missing its API key. */
  | { type: 'problems' }
  | { type: 'outcome'; outcome: string }
  | { type: 'errorReason'; reason: string }
  | { type: 'warningReason'; reason: string }
  | { type: 'errorMessage'; reason: string; message: string }
  /** Rules whose last run failed with one of the given API key rejection messages. */
  | { type: 'apiKeyError'; messages: string[] }
  | { type: 'missingApiKey' };

const OUTCOME_FIELD = 'alert.attributes.lastRun.outcome';
const ERROR_REASON_FIELD = 'alert.attributes.executionStatus.error.reason';
const ERROR_MESSAGE_FIELD = 'alert.attributes.executionStatus.error.message';
const WARNING_REASON_FIELD = 'alert.attributes.executionStatus.warning.reason';
const TAGS_FIELD = 'alert.attributes.tags';

const quoted = (value: string): KueryNode => nodeTypes.literal.buildNode(value, true);

/**
 * Matches rules classified `unauthorized`, plus legacy `execute` rules through the exact messages
 * reported by the health endpoint or a UIAM error code. Only single-token wildcards survive the
 * saved objects `query_string` path, which splits patterns on whitespace, so the longer textual
 * markers are not matched here.
 */
const apiKeyErrorNode = (messages: string[]): KueryNode =>
  nodeBuilder.or([
    nodeBuilder.is(ERROR_REASON_FIELD, RuleExecutionStatusErrorReasons.Unauthorized),
    ...messages.map((message) => nodeBuilder.is(ERROR_MESSAGE_FIELD, quoted(message))),
    ...Object.keys(API_KEY_AUTH_ERROR_CODES).map((code) =>
      nodeBuilder.is(ERROR_MESSAGE_FIELD, nodeTypes.wildcard.buildNode(`*${code}*`))
    ),
  ]);

const missingApiKeyNode = (): KueryNode =>
  nodeBuilder.or([
    nodeBuilder.is(TAGS_FIELD, quoted(MISSING_UIAM_API_KEY_TAG)),
    nodeBuilder.is(TAGS_FIELD, quoted(LEGACY_MISSING_UIAM_API_KEY_TAG)),
  ]);

/** Builds the KQL node that narrows the rules list to the given health selection. */
export const buildRuleHealthKueryNode = (selection: RuleHealthSelection): KueryNode => {
  switch (selection.type) {
    case 'problems':
      return nodeBuilder.or([
        nodeBuilder.is(OUTCOME_FIELD, 'failed'),
        nodeBuilder.is(OUTCOME_FIELD, 'warning'),
        missingApiKeyNode(),
      ]);
    case 'outcome':
      return nodeBuilder.is(OUTCOME_FIELD, selection.outcome);
    case 'errorReason':
      return nodeBuilder.is(ERROR_REASON_FIELD, selection.reason);
    case 'warningReason':
      return nodeBuilder.is(WARNING_REASON_FIELD, selection.reason);
    case 'errorMessage':
      return nodeBuilder.and([
        nodeBuilder.is(ERROR_REASON_FIELD, selection.reason),
        nodeBuilder.is(ERROR_MESSAGE_FIELD, quoted(selection.message)),
      ]);
    case 'apiKeyError':
      return apiKeyErrorNode(selection.messages);
    case 'missingApiKey':
      return missingApiKeyNode();
  }
};

export const isSameRuleHealthSelection = (
  a: RuleHealthSelection,
  b: RuleHealthSelection
): boolean => {
  if (a.type !== b.type) {
    return false;
  }
  switch (a.type) {
    case 'outcome':
      return a.outcome === (b as typeof a).outcome;
    case 'errorReason':
    case 'warningReason':
      return a.reason === (b as typeof a).reason;
    case 'errorMessage':
      return a.reason === (b as typeof a).reason && a.message === (b as typeof a).message;
    default:
      return true;
  }
};
