/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { EuiBadge, EuiIcon } from '@elastic/eui';
import type { AppHeaderBadge } from '@kbn/app-header';
import type { CaseSeverity, CaseStatusConfiguration } from '../../../../../../common/types/domain';
import { CaseAccessMode } from '../../../../../../common/types/domain';
import type { CaseUI } from '../../../../../../common';
import { statuses } from '../../../../status/config';
import { severities } from '../../../../severity/config';
import * as i18n from '../../../translations';
import { PAUSED_TOOLTIP } from '../../../../../common/translations';

interface GetBadgesArgs {
  caseData: CaseUI;
  /** The configured status the case is on */
  currentStatus: CaseStatusConfiguration;
  /** The statuses the case can move to */
  statusOptions: CaseStatusConfiguration[];
  isStatusMenuDisabled: boolean;
  isSeverityMenuDisabled: boolean;
  onStatusChanged: (status: CaseStatusConfiguration) => void;
  onSeverityChanged: (severity: CaseSeverity) => void;
  /** Absent when restricted cases are unavailable (flag off or license below Platinum). */
  access?: {
    isMenuDisabled: boolean;
    onAccessChanged: (mode: CaseAccessMode) => void;
  };
  /** Agentic cases put Status first; otherwise main's order is kept. */
  statusFirst?: boolean;
}

/**
 * Kibana's header shows every badge only when there are at most three, and otherwise folds all but
 * the first two into "+N". With agentic cases on (more badges), Status and the access boundary come
 * first so they never fold away.
 */
export const getBadges = ({
  caseData,
  currentStatus,
  statusOptions,
  isStatusMenuDisabled,
  isSeverityMenuDisabled,
  onStatusChanged,
  onSeverityChanged,
  access,
  statusFirst = false,
}: GetBadgesArgs): AppHeaderBadge[] => {
  const result: AppHeaderBadge[] = [];

  const statusBadge: AppHeaderBadge = {
    label: currentStatus.label,
    onClickAriaLabel: i18n.STATUS_BADGE_ARIA_LABEL(currentStatus.label),
    color: statuses[currentStatus.category].color as AppHeaderBadge['color'],
    'data-test-subj': 'case-view-status-badge',
    // The header badge only takes a string, so the relative time is formatted here.
    ...(caseData.pausedAt != null && {
      tooltip: `${PAUSED_TOOLTIP(caseData.pauseReason ?? '')} ${moment(
        caseData.pausedAt
      ).fromNow()}`,
    }),
  };

  if (!isStatusMenuDisabled) {
    statusBadge.items = statusOptions.map((status) => ({
      name: status.label,
      onClick: () => onStatusChanged(status),
      'data-test-subj': `case-view-status-dropdown-${status.key}`,
    }));
  }
  result.push(statusBadge);

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
  const severityLabel = severityConfig?.label ?? caseData.severity;
  const severityBadge: AppHeaderBadge = {
    label: severityLabel,
    onClickAriaLabel: i18n.SEVERITY_BADGE_ARIA_LABEL(severityLabel),
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

  if (statusFirst) {
    return result;
  }

  // Main's order: access, severity, status, then the alerts count.
  const [status, ...rest] = result;
  const severityIndex = rest.findIndex(
    (badge) => badge['data-test-subj'] === 'case-view-severity-badge'
  );
  return [...rest.slice(0, severityIndex + 1), status, ...rest.slice(severityIndex + 1)];
};
