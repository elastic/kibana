/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { ALERT_ACTION_GROUP } from '@kbn/rule-data-utils';
import { Alert as LegacyAlert } from '../../alert';
import { ActionGroup, AlertInstanceState, AlertInstanceContext, RuleAlertData } from '../../types';

export const isAlertImproving = <
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  alert: Alert & AlertData,
  legacyAlert: LegacyAlert<LegacyState, LegacyContext, ActionGroupIds | RecoveryActionGroupId>,
  actionGroups: Array<ActionGroup<string>>
): boolean | null => {
  const currentActionGroup = legacyAlert.getScheduledActionOptions()?.actionGroup;
  const previousActionGroup = get(alert, ALERT_ACTION_GROUP);

  if (!currentActionGroup || !previousActionGroup) {
    return null;
  }

  // Get action group definitions
  const currentActionGroupDef = actionGroups.find((ag) => ag.id === currentActionGroup);
  const previousActionGroupDef = actionGroups.find((ag) => ag.id === previousActionGroup);
  if (
    currentActionGroupDef &&
    previousActionGroupDef &&
    currentActionGroupDef.severity &&
    previousActionGroupDef.severity
  ) {
    const toRet =
      currentActionGroupDef.severity.level === previousActionGroupDef.severity.level
        ? null
        : currentActionGroupDef.severity.level < previousActionGroupDef.severity.level;
    return toRet;
  }

  return null;
};
