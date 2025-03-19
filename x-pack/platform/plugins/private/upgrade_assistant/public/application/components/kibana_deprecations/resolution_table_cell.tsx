/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexItem,
  EuiText,
  EuiFlexGroup,
  EuiIcon,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { DeprecationResolutionState } from './kibana_deprecations';

const manualI18nTexts = {
  manualCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.manualCellLabel',
    {
      defaultMessage: 'Manual',
    }
  ),
  manualCellTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.manualCellTooltipLabel',
    {
      defaultMessage: 'This issue needs to be resolved manually.',
    }
  ),
};

const automatedI18nTexts = {
  resolutionTypeCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.automatedCellLabel',
    {
      defaultMessage: 'Automated',
    }
  ),
  resolutionProgressCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.automationInProgressCellLabel',
    {
      defaultMessage: 'Resolution in progress…',
    }
  ),
  resolutionCompleteCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.automationCompleteCellLabel',
    {
      defaultMessage: 'Resolved',
    }
  ),
  resolutionFailedCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.automationFailedCellLabel',
    {
      defaultMessage: 'Resolution failed',
    }
  ),
  resolutionCellTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.automatedCellTooltipLabel',
    {
      defaultMessage: 'This issue can be resolved automatically.',
    }
  ),
};

const markAsResolvedI18nTexts = {
  resolutionTypeCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.markAsResolvedCellLabel',
    {
      defaultMessage: 'Mark as resolved',
    }
  ),
  resolutionProgressCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.markAsResolvedInProgressCellLabel',
    {
      defaultMessage: 'Marking as resolved…',
    }
  ),
  resolutionCompleteCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.markAsResolvedCompleteCellLabel',
    {
      defaultMessage: 'Marked as resolved',
    }
  ),
  resolutionFailedCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.markAsResolvedFailedCellLabel',
    {
      defaultMessage: 'Failed to mark as resolved',
    }
  ),
  resolutionCellTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.markAsResolvedCellTooltipLabel',
    {
      defaultMessage: 'This issue can be marked as resolved.',
    }
  ),
};

interface Props {
  deprecationId: string;
  isAutomated: boolean;
  canBeMarkedAsResolved: boolean;
  deprecationResolutionState?: DeprecationResolutionState;
}

export const ResolutionTableCell: React.FunctionComponent<Props> = ({
  deprecationId,
  isAutomated,
  canBeMarkedAsResolved,
  deprecationResolutionState,
}) => {
  if (isAutomated || canBeMarkedAsResolved) {
    const resolutionI18nTexts = isAutomated ? automatedI18nTexts : markAsResolvedI18nTexts;
    const euiIconType = isAutomated ? 'indexSettings' : 'clickLeft';

    if (deprecationResolutionState?.id === deprecationId) {
      const { resolveDeprecationStatus } = deprecationResolutionState;

      switch (resolveDeprecationStatus) {
        case 'in_progress':
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="resolutionStatusCell">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{resolutionI18nTexts.resolutionProgressCellLabel}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        case 'fail':
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="resolutionStatusCell">
              <EuiFlexItem grow={false}>
                <EuiIcon type="warning" color="danger" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{resolutionI18nTexts.resolutionFailedCellLabel}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        case 'ok':
        default:
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="resolutionStatusCell">
              <EuiFlexItem grow={false}>
                <EuiIcon type="check" color="success" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{resolutionI18nTexts.resolutionCompleteCellLabel}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
      }
    }

    return (
      <EuiToolTip position="top" content={resolutionI18nTexts.resolutionCellTooltipLabel}>
        <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="resolutionStatusCell">
          <EuiFlexItem grow={false}>
            <EuiIcon type={euiIconType} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{resolutionI18nTexts.resolutionTypeCellLabel}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiToolTip>
    );
  }

  return (
    <EuiToolTip
      position="top"
      content={manualI18nTexts.manualCellTooltipLabel}
      data-test-subj="resolutionStatusCell"
    >
      <EuiText size="s" color="subdued">
        {manualI18nTexts.manualCellLabel}
      </EuiText>
    </EuiToolTip>
  );
};
