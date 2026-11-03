/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiIcon } from '@elastic/eui';
import type { AppHeaderBadge } from '@kbn/app-header';
import type { CaseSeverity, CaseStatusDefinition } from '../../../../../../common/types/domain';
import type { CaseUI } from '../../../../../../common';
import { severities } from '../../../../severity/config';
import * as i18n from '../../../translations';

interface GetBadgesArgs {
  caseData: CaseUI;
  /** The status the case is in. */
  currentStatus: CaseStatusDefinition;
  /** The statuses the status menu lists, in admin order. */
  statusOptions: CaseStatusDefinition[];
  isStatusMenuDisabled: boolean;
  isSeverityMenuDisabled: boolean;
  onStatusChanged: (status: CaseStatusDefinition) => void;
  onSeverityChanged: (severity: CaseSeverity) => void;
}

export const getBadges = ({
  caseData,
  currentStatus,
  statusOptions,
  isStatusMenuDisabled,
  isSeverityMenuDisabled,
  onStatusChanged,
  onSeverityChanged,
}: GetBadgesArgs): AppHeaderBadge[] => {
  const result: AppHeaderBadge[] = [];

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

  const statusBadge: AppHeaderBadge = {
    label: currentStatus.label,
    onClickAriaLabel: i18n.STATUS_BADGE_ARIA_LABEL(currentStatus.label),
    color: currentStatus.color,
    'data-test-subj': 'case-view-status-badge',
  };

  if (!isStatusMenuDisabled) {
    statusBadge.items = statusOptions.map((status) => ({
      name: status.label,
      onClick: () => onStatusChanged(status),
      // A disabled status is listed only because the case is in it; cases cannot move to it.
      ...(status.disabled && { disabled: true, toolTipContent: i18n.STATUS_DISABLED_HINT }),
      'data-test-subj': `case-view-status-dropdown-${status.key}`,
    }));
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
