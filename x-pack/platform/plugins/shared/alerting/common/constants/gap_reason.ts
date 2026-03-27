/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Describes the detected reason for a rule execution gap.
 * - rule_disabled: the gap was caused by a disable/enable cycle
 * - rule_did_not_run: the gap cause is unknown or the rule failed to run for other reasons
 */
export const gapReasonType = {
  RULE_DISABLED: 'rule_disabled',
  RULE_DID_NOT_RUN: 'rule_did_not_run',
} as const;

export type GapReasonType = (typeof gapReasonType)[keyof typeof gapReasonType];

export interface GapReason {
  type: GapReasonType;
}
