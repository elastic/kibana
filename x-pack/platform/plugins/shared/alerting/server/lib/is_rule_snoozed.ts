/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first, isEmpty } from 'lodash';
import { SanitizedRule, RuleTypeParams } from '../../common/rule';
import { getActiveSnoozeIfExist } from './snooze/get_active_snooze_if_exist';

type RuleSnoozeProps = Pick<SanitizedRule<RuleTypeParams>, 'muteAll' | 'snoozeSchedule'>;
type ActiveSnoozes = Array<{ snoozeEndTime: Date; id: string; lastOccurrence?: Date }>;

export function getActiveSnoozes(rule: RuleSnoozeProps): ActiveSnoozes | null {
  if (rule.snoozeSchedule == null || isEmpty(rule.snoozeSchedule)) {
    return null;
  }

  return (
    rule.snoozeSchedule
      .map((snooze) => getActiveSnoozeIfExist(snooze))
      .filter(Boolean)
      // Sort in descending snoozeEndTime order
      .sort((a, b) => b!.snoozeEndTime.getTime() - a!.snoozeEndTime.getTime()) as ActiveSnoozes
  );
}

export function getActiveScheduledSnoozes(rule: RuleSnoozeProps): ActiveSnoozes | null {
  return getActiveSnoozes(rule)?.filter((r) => Boolean(r.id)) ?? null;
}

export function getRuleSnoozeEndTime(rule: RuleSnoozeProps): Date | null {
  return first(getActiveSnoozes(rule))?.snoozeEndTime ?? null;
}

export function isRuleSnoozed(rule: RuleSnoozeProps) {
  if (rule.muteAll) {
    return true;
  }
  return Boolean(getRuleSnoozeEndTime(rule));
}
