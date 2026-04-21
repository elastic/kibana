/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { UserActionTitle } from '@kbn/cases-components';
import * as i18n from '../../user_actions/translations';
import type { RuleDetailsNavigation } from '../../user_actions/types';

interface AlertCommentEventProps {
  actionId: string;
  totalAlerts: number;
  ruleId?: string | null;
  ruleName?: string | null;
  getRuleDetailsHref?: RuleDetailsNavigation['href'];
  onRuleDetailsClick?: RuleDetailsNavigation['onClick'];
  loadingAlertData?: boolean;
}

export const AlertCommentEvent = ({
  actionId,
  totalAlerts,
  getRuleDetailsHref,
  loadingAlertData = false,
  onRuleDetailsClick,
  ruleId,
  ruleName,
}: AlertCommentEventProps) => {
  const label =
    totalAlerts === 1
      ? i18n.ALERT_COMMENT_LABEL_TITLE
      : i18n.MULTIPLE_ALERTS_COMMENT_LABEL_TITLE(totalAlerts);

  const link = useMemo(
    () => ({
      targetId: ruleId,
      label: ruleName,
      fallbackLabel: i18n.UNKNOWN_RULE,
      dataTestSubj: `alert-rule-link-${actionId}`,
      getHref: getRuleDetailsHref,
      onClick: onRuleDetailsClick,
      isLoading: loadingAlertData,
    }),
    [actionId, getRuleDetailsHref, loadingAlertData, onRuleDetailsClick, ruleId, ruleName]
  );

  return (
    <UserActionTitle dataTestSubj={`alerts-user-action-${actionId}`} label={label} link={link} />
  );
};
AlertCommentEvent.displayName = 'AlertCommentEvent';
