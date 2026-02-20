/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { SharePluginStart } from '@kbn/share-plugin/public';

export interface DashboardFlyoutInitialInput {
  timeRange: {
    from: string;
    to: string;
  };
  viewMode: 'view';
  panels: DashboardState['panels'];
  title?: string;
  description?: string;
}

interface DashboardFlyoutFooterProps {
  onClose: () => void;
  share?: SharePluginStart;
  savedObjectId?: string;
  initialDashboardInput: DashboardFlyoutInitialInput;
}

export const DashboardFlyoutFooter: React.FC<DashboardFlyoutFooterProps> = ({
  onClose,
  share,
  savedObjectId,
  initialDashboardInput,
}) => {
  const handleOpenInDashboard = useCallback(async () => {
    if (!share) return;

    const locator = share.url.locators.get(DASHBOARD_APP_LOCATOR);
    if (!locator) return;

    await locator.navigate({
      dashboardId: savedObjectId,
      panels: initialDashboardInput.panels,
      title: initialDashboardInput.title,
      description: initialDashboardInput.description,
      viewMode: 'edit' as const,
      time_range: initialDashboardInput.timeRange,
    });
    onClose();
  }, [share, savedObjectId, initialDashboardInput, onClose]);

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onClose} data-test-subj="dashboardFlyoutCloseButton">
            {i18n.translate('xpack.dashboardAgent.flyout.closeButton', {
              defaultMessage: 'Close',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={handleOpenInDashboard}
            fill
            iconType="popout"
            data-test-subj="dashboardFlyoutOpenInDashboardButton"
          >
            {i18n.translate('xpack.dashboardAgent.flyout.openInDashboardButton', {
              defaultMessage: 'Open in Dashboard',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
