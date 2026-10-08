/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiIcon } from '@elastic/eui';
import type { AppHeaderBadge } from '@kbn/app-header';
import type { CaseSeverity } from '../../../../../../common/types/domain';
import { CaseAccessMode, CaseStatuses } from '../../../../../../common/types/domain';
import type { CaseUI } from '../../../../../../common';
import { statuses } from '../../../../status/config';
import { severities } from '../../../../severity/config';
import * as i18n from '../../../translations';

interface GetBadgesArgs {
  caseData: CaseUI;
  isStatusMenuDisabled: boolean;
  isSeverityMenuDisabled: boolean;
  onStatusChanged: (status: CaseStatuses) => void;
  onSeverityChanged: (severity: CaseSeverity) => void;
  /** Absent when restricted cases are unavailable (flag off or license below Platinum). */
  access?: {
    isMenuDisabled: boolean;
    onAccessChanged: (mode: CaseAccessMode) => void;
  };
}

export const getBadges = ({
  caseData,
  isStatusMenuDisabled,
  isSeverityMenuDisabled,
  onStatusChanged,
  onSeverityChanged,
  access,
}: GetBadgesArgs): AppHeaderBadge[] => {
  const result: AppHeaderBadge[] = [];

  if (access !== undefined) {
    const isRestricted = caseData.access?.mode === CaseAccessMode.RESTRICTED;
    const accessBadge: AppHeaderBadge = {
      label: isRestricted ? i18n.ACCESS_RESTRICTED : i18n.ACCESS_EVERYONE,
      color: 'hollow',
      'data-test-subj': 'case-view-access-badge',
      renderCustomBadge: ({ badgeText }) => (
        <EuiBadge color="hollow" data-test-subj="case-view-access-badge">
          <EuiIcon type={isRestricted ? 'lock' : 'lockOpen'} size="s" aria-hidden={true} />{' '}
          {badgeText}
        </EuiBadge>
      ),
    };

    if (!access.isMenuDisabled) {
      accessBadge.items = [
        {
          name: i18n.ACCESS_EVERYONE,
          onClick: () => access.onAccessChanged(CaseAccessMode.DEFAULT),
          'data-test-subj': 'case-view-access-dropdown-default',
        },
        {
          name: i18n.ACCESS_RESTRICTED,
          onClick: () => access.onAccessChanged(CaseAccessMode.RESTRICTED),
          'data-test-subj': 'case-view-access-dropdown-restricted',
        },
      ];
    }
    result.push(accessBadge);
  }

  const severityConfig = severities[caseData.severity];
  const severityBadge: AppHeaderBadge = {
    label: severityConfig?.label ?? caseData.severity,
    color: severityConfig?.badgeColor ?? 'default',
    'data-test-subj': 'case-view-severity-badge',
  };

  if (!isSeverityMenuDisabled) {
    severityBadge.items = (Object.keys(severities) as CaseSeverity[]).map((severity) => ({
      name: severities[severity].label,
      onClick: () => onSeverityChanged(severity),
      'data-test-subj': `case-view-severity-dropdown-${severity}`,
    }));
  }
  result.push(severityBadge);

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
