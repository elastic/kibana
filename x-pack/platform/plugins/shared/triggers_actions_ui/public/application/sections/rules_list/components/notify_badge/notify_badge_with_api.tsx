/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useKibana } from '../../../../../common/lib/kibana';
import { SnoozeSchedule } from '../../../../../types';
import { unsnoozeRule as unsnoozeRuleApi } from '../../../../lib/rule_api/unsnooze';
import { snoozeRule as snoozeRuleApi } from '../../../../lib/rule_api/snooze';
import { RulesListNotifyBadge } from './notify_badge';
import { RulesListNotifyBadgePropsWithApi } from './types';

export const RulesListNotifyBadgeWithApi: React.FunctionComponent<
  RulesListNotifyBadgePropsWithApi
> = ({
  ruleId,
  snoozeSettings,
  loading,
  disabled,
  showTooltipInline,
  showOnHover,
  onRuleChanged,
}) => {
  const { http } = useKibana().services;

  const onSnoozeRule = useCallback(
    (snoozeSchedule: SnoozeSchedule) =>
      ruleId ? snoozeRuleApi({ http, id: ruleId, snoozeSchedule }) : Promise.resolve(),
    [http, ruleId]
  );

  const onUnsnoozeRule = useCallback(
    (scheduleIds?: string[]) =>
      ruleId ? unsnoozeRuleApi({ http, id: ruleId, scheduleIds }) : Promise.resolve(),
    [http, ruleId]
  );

  return (
    <RulesListNotifyBadge
      snoozeSettings={snoozeSettings}
      loading={loading}
      disabled={disabled}
      onRuleChanged={onRuleChanged}
      snoozeRule={onSnoozeRule}
      unsnoozeRule={onUnsnoozeRule}
      showTooltipInline={showTooltipInline}
      showOnHover={showOnHover}
    />
  );
};
