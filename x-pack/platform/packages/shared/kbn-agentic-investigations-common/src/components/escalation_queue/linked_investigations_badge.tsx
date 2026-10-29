/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ACTIONS_TRANSLATIONS } from '../actions/translations';

interface LinkedInvestigationsBadgeProps {
  count: number;
  /** Greys the badge out and swaps its tooltip for the missing-privilege message. */
  isDisabled?: boolean;
}

export const LinkedInvestigationsBadge = memo<LinkedInvestigationsBadgeProps>(
  ({ count, isDisabled = false }) => {
    const tooltipContent = i18n.translate(
      'xpack.alertzero.escalationQueue.linkedInvestigationsTooltip',
      {
        defaultMessage:
          '{count, plural, one {# linked investigation} other {# linked investigations}}',
        values: { count },
      }
    );

    if (isDisabled) {
      return (
        <EuiToolTip
          content={ACTIONS_TRANSLATIONS.tooltips.escalationsAgentBuilderPrivilegeRequired}
        >
          <EuiBadge color="hollow" iconType="inspect" isDisabled tabIndex={0}>
            {count}
          </EuiBadge>
        </EuiToolTip>
      );
    }

    return (
      <EuiToolTip content={tooltipContent}>
        {/* tabIndex makes the badge keyboard-focusable so the tooltip is accessible */}
        <EuiBadge color="hollow" iconType="inspect" tabIndex={0}>
          {count}
        </EuiBadge>
      </EuiToolTip>
    );
  }
);

LinkedInvestigationsBadge.displayName = 'LinkedInvestigationsBadge';
