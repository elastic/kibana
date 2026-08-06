/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const ScheduledActionsBadge: React.FunctionComponent<{
  scheduledActionsCount: number;
  onClick: () => void;
}> = ({ scheduledActionsCount, onClick }) => {
  if (scheduledActionsCount === 0) {
    return null;
  }

  return (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.fleet.agentList.scheduledActionsBadge.tooltip"
          defaultMessage="{count, plural, one {# agent is} other {# agents are}} scheduled to be unenrolled. Click to review."
          values={{ count: scheduledActionsCount }}
        />
      }
    >
      <EuiBadge
        color="warning"
        onClick={onClick}
        onClickAriaLabel={i18n.translate('xpack.fleet.agentList.scheduledActionsBadge.ariaLabel', {
          defaultMessage: 'Open the Agent activity flyout to review scheduled unenrollment',
        })}
        iconType="clock"
        data-test-subj="scheduledActionsBadge"
      >
        <FormattedMessage
          id="xpack.fleet.agentList.scheduledActionsBadge.label"
          defaultMessage="Unenrollment scheduled"
        />
      </EuiBadge>
    </EuiToolTip>
  );
};
