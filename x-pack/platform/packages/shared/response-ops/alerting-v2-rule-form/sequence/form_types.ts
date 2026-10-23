/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind } from '@kbn/alerting-v2-schemas';
export type HopWindowUnit = 's' | 'm' | 'h' | 'd';

export interface HopWindow {
  value: number;
  unit: HopWindowUnit;
}

export const HOP_WINDOW_UNIT_SECONDS: Record<HopWindowUnit, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

export const hopWindowToSeconds = (w: HopWindow): number =>
  w.value * HOP_WINDOW_UNIT_SECONDS[w.unit];

export const secondsToHopWindow = (totalSeconds: number): HopWindow => {
  if (totalSeconds % 86400 === 0) return { value: totalSeconds / 86400, unit: 'd' };
  if (totalSeconds % 3600 === 0) return { value: totalSeconds / 3600, unit: 'h' };
  if (totalSeconds % 60 === 0) return { value: totalSeconds / 60, unit: 'm' };
  return { value: totalSeconds, unit: 's' };
};

export const hopWindowToScheduleString = (w: HopWindow): string => `${w.value}${w.unit}`;

export interface SequenceSubRule {
  ruleId: string;
  ruleName: string;
  groupingFields: string[];
  kind: RuleKind;
  isMissing?: boolean;
}

export interface RuleKindPair {
  ruleId: string;
  kind: RuleKind;
}

export interface SequenceStep {
  id: string;
  rules: SequenceSubRule[];
  operator: 'and' | 'or';
}

export type SequenceRecoveryMode = 'last' | 'all' | 'custom';

export interface SequenceFormValues {
  steps: SequenceStep[];
  hopWindows: HopWindow[];
  recoveryMode: SequenceRecoveryMode;
  recoveryStepIndices?: number[];
}

export const RULE_DRAG_MIME_TYPE = 'application/x-alerting-v2-rule-id';

let idCounter = 0;
export const generateStepId = (): string => `step_${Date.now()}_${++idCounter}`;

export const DEFAULT_SEQUENCE_FORM_VALUES: SequenceFormValues = {
  steps: [],
  hopWindows: [],
  recoveryMode: 'last',
};

export const recoveryTrackedStepIndices = (state: SequenceFormValues): number[] => {
  const { steps, recoveryMode, recoveryStepIndices } = state;
  if (steps.length === 0) return [];

  if (recoveryMode === 'all') return steps.map((_, i) => i);

  if (recoveryMode === 'custom') {
    const picked = [...new Set(recoveryStepIndices ?? [])]
      .filter((i) => Number.isInteger(i) && i >= 0 && i < steps.length)
      .sort((a, b) => a - b);
    if (picked.length > 0) return picked;
  }

  return [steps.length - 1];
};

export const isSequenceValid = (state: SequenceFormValues): boolean => {
  if (state.steps.length < 2) return false;
  if (state.hopWindows.length !== state.steps.length - 1) return false;
  if (state.steps.some((s) => s.rules.length === 0)) return false;
  if (state.hopWindows.some((w) => w.value <= 0)) return false;

  const picked = state.recoveryStepIndices ?? [];
  if (picked.some((i) => !Number.isInteger(i) || i < 0 || i >= state.steps.length)) return false;
  if (new Set(picked).size !== picked.length) return false;
  return true;
};

export const totalLookbackSeconds = (state: SequenceFormValues): number =>
  state.hopWindows.reduce((sum, w) => sum + hopWindowToSeconds(w), 0);

export const formatLookbackString = (totalSeconds: number): string =>
  totalSeconds <= 0 ? '' : hopWindowToScheduleString(secondsToHopWindow(totalSeconds));

export const getCommonGroupingFields = (state: SequenceFormValues): string[] => {
  const allRules = state.steps.flatMap((s) => s.rules);
  if (allRules.length === 0) return [];

  const first = allRules[0].groupingFields;
  if (first.length === 0) return [];

  const firstKey = first.join('\0');
  const allMatch = allRules.every((r) => r.groupingFields.join('\0') === firstKey);
  return allMatch ? first : [];
};
