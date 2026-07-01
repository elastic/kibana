/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiIcon } from '@elastic/eui';
import type { AppHeaderBadge } from '@kbn/app-header';
import { CaseStatuses } from '../../../../../../../common/types/domain';
import type { CaseUI } from '../../../../../../../common';
import { statuses } from '../../../../../status/config';
import { severities } from '../../../../../severity/config';

interface GetBadgesArgs {
  caseData: CaseUI;
  isStatusMenuDisabled: boolean;
  onStatusChanged: (status: CaseStatuses) => void;
}

export const getBadges = ({
  caseData,
  isStatusMenuDisabled,
  onStatusChanged,
}: GetBadgesArgs): AppHeaderBadge[] => {
  const result: AppHeaderBadge[] = [];

  const severityConfig = severities[caseData.severity];
  result.push({
    label: severityConfig?.label ?? caseData.severity,
    color: severityConfig?.badgeColor ?? 'default',
    'data-test-subj': 'case-view-severity-badge',
  });

  const statusConfig = statuses[caseData.status];
  const statusBadge: AppHeaderBadge = {
    label: statusConfig.label,
    color: statusConfig.color as AppHeaderBadge['color'],
    'data-test-subj': 'case-view-status-badge',
  };

  if (!isStatusMenuDisabled) {
    statusBadge.items = [
      {
        name: statuses.open.label,
        onClick: () => onStatusChanged(CaseStatuses.open),
        'data-test-subj': 'case-view-status-dropdown-open',
      },
      {
        name: statuses['in-progress'].label,
        onClick: () => onStatusChanged(CaseStatuses['in-progress']),
        'data-test-subj': 'case-view-status-dropdown-in-progress',
      },
      {
        name: statuses.closed.label,
        onClick: () => onStatusChanged(CaseStatuses.closed),
        'data-test-subj': 'case-view-status-dropdown-closed',
      },
    ];
  }
  result.push(statusBadge);

  if (caseData.totalAlerts > 0) {
    result.push({
      label: String(caseData.totalAlerts),
      color: 'danger',
      'data-test-subj': 'case-view-alerts-count-badge',
      renderCustomBadge: ({ badgeText }) => (
        <EuiBadge color="danger" data-test-subj="case-view-alerts-count-badge">
          <EuiIcon type="warning" size="s" aria-hidden={true} /> {badgeText}
        </EuiBadge>
      ),
    });
  }

  return result;
};
