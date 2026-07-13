/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiPopoverTitle, EuiSpacer, EuiSwitch, EuiWrappingPopover } from '@elastic/eui';
import { useCasesFeatures } from '../../../../../common/use_cases_features';
import * as i18n from '../../../../case_view/translations';
import { SHOW_METRICS } from '../../../translations';

interface CaseSettingsPopoverProps {
  syncAlerts: boolean;
  onSyncAlertsChange: (enabled: boolean) => void;
  showMetrics: boolean;
  onShowMetricsChange: (enabled: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
  anchorElement: HTMLElement;
}

// The template selector lives exclusively in the sidebar's `TemplateSettingsPopover`, which
// routes template changes through `ConfirmChangeTemplateModal`. It intentionally does not
// live here as well, to avoid a second entry point that could bypass that confirmation.
export const CaseSettingsPopover: FC<CaseSettingsPopoverProps> = ({
  syncAlerts,
  onSyncAlertsChange,
  showMetrics,
  onShowMetricsChange,
  isOpen,
  onClose,
  anchorElement,
}) => {
  const { isSyncAlertsEnabled, metricsFeatures } = useCasesFeatures();
  const hasMetrics = metricsFeatures.length > 0;

  return (
    <EuiWrappingPopover
      button={anchorElement}
      isOpen={isOpen}
      closePopover={onClose}
      anchorPosition="downRight"
      panelPaddingSize="m"
      aria-label={i18n.CASE_SETTINGS}
      data-test-subj="case-settings-popover"
    >
      <EuiPopoverTitle>{i18n.CASE_SETTINGS}</EuiPopoverTitle>
      {isSyncAlertsEnabled && (
        <>
          <EuiSwitch
            label={i18n.SYNC_ALERTS}
            checked={syncAlerts}
            onChange={(e) => onSyncAlertsChange(e.target.checked)}
            compressed
            data-test-subj="case-settings-sync-alerts-switch"
          />
          <EuiSpacer size="m" />
        </>
      )}
      {hasMetrics && (
        <EuiSwitch
          label={SHOW_METRICS}
          checked={showMetrics}
          onChange={(e) => onShowMetricsChange(e.target.checked)}
          compressed
          data-test-subj="case-settings-show-metrics-switch"
        />
      )}
    </EuiWrappingPopover>
  );
};

CaseSettingsPopover.displayName = 'CaseSettingsPopover';
