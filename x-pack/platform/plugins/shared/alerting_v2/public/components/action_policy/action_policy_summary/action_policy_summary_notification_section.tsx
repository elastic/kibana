/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FlyoutSection } from '@kbn/flyout-sections';
import { i18n } from '@kbn/i18n';
import { BadgeList } from '../badge_list';
import {
  DISPATCH_PER_LABEL,
  FREQUENCY_LABEL,
  GROUP_BY_LABEL,
  getFrequencyLabel,
  getGroupingModeLabel,
} from '../labels';
import { Column, SubsectionColumns } from '../details_flyout/subsection_columns';
import { useActionPolicySummary } from './action_policy_summary_context';

export const ActionPolicySummaryNotificationSection = () => {
  const { grouping, throttle } = useActionPolicySummary();

  return (
    <FlyoutSection
      id="notification"
      title={i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.notification.title', {
        defaultMessage: 'Notification',
      })}
      data-test-subj="actionPolicyDetailsFlyoutNotification"
    >
      <SubsectionColumns hasBorder>
        <Column
          title={DISPATCH_PER_LABEL}
          data-test-subj="actionPolicyDetailsFlyoutDispatchModeBlock"
        >
          {getGroupingModeLabel(grouping?.mode)}
        </Column>
        {grouping?.mode === 'per_field' && (
          <Column title={GROUP_BY_LABEL} data-test-subj="actionPolicyDetailsFlyoutGroupByBlock">
            <BadgeList items={grouping.fields} />
          </Column>
        )}
        <Column title={FREQUENCY_LABEL} data-test-subj="actionPolicyDetailsFlyoutFrequencyBlock">
          {getFrequencyLabel(throttle, grouping?.mode)}
        </Column>
      </SubsectionColumns>
    </FlyoutSection>
  );
};
