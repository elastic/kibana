/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface LinkedInvestigationsBadgeProps {
  count: number;
}

export const LinkedInvestigationsBadge = memo<LinkedInvestigationsBadgeProps>(({ count }) => {
  const tooltipContent = i18n.translate(
    'xpack.alertzero.escalationQueue.linkedInvestigationsTooltip',
    {
      defaultMessage:
        '{count, plural, one {# linked investigation} other {# linked investigations}}',
      values: { count },
    }
  );

  return (
    <EuiToolTip content={tooltipContent}>
      {/* tabIndex makes the badge keyboard-focusable so the tooltip is accessible */}
      <EuiBadge color="hollow" iconType="inspect" tabIndex={0}>
        {count}
      </EuiBadge>
    </EuiToolTip>
  );
});

LinkedInvestigationsBadge.displayName = 'LinkedInvestigationsBadge';
