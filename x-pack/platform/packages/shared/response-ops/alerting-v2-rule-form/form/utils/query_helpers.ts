/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recoveryStrategy } from '@kbn/alerting-v2-schemas';
import type { RuleQuery, RuleRecovery } from '../types';

const joinQuerySegment = (base: string, segment: string): string => {
  const trimmedBase = base.trim();
  const trimmedSegment = segment.trim();

  if (!trimmedSegment) {
    return trimmedBase;
  }

  if (!trimmedBase) {
    return trimmedSegment.startsWith('|') ? trimmedSegment : `| ${trimmedSegment}`;
  }

  const normalizedSegment = trimmedSegment.startsWith('|') ? trimmedSegment : `| ${trimmedSegment}`;

  return `${trimmedBase}\n${normalizedSegment}`;
};

/** Returns the effective breach query — `base` with the breach segment appended. */
export const getBreachQuery = (query: RuleQuery | undefined): string => {
  if (!query) return '';
  return joinQuerySegment(query.base, query.breach.segment);
};

/** Returns the recovery query for the strategies that run one, otherwise an empty string. */
export const getRecoverQuery = (
  query: RuleQuery | undefined,
  recovery: RuleRecovery | undefined
): string => {
  if (recovery?.strategy === recoveryStrategy.query) return recovery.query ?? '';
  if (recovery?.strategy !== recoveryStrategy.condition) return '';
  if (!query || !recovery.segment?.trim()) return '';
  return joinQuerySegment(query.base, recovery.segment);
};
