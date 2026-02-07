/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import type { DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { normalizePanels, buildMarkdownPanel, getMarkdownPanelHeight } from '../utils/panel_utils';
import type { AttachmentStore } from '../services/attachment_store';

export interface DashboardFlyoutProps {
  initialData: DashboardAttachmentData;
  attachmentId: string;
  attachmentStore: AttachmentStore;
  onClose: () => void;
  share?: SharePluginStart;
}

export const DashboardFlyout: React.FC<DashboardFlyoutProps> = ({
  initialData,
  attachmentId,
  attachmentStore,
  onClose,
  share,
}) => {
  const [data, setData] = useState<DashboardAttachmentData>(initialData);
  const [version, setVersion] = useState(0);
  const { panels, markdownContent, title, description, savedObjectId } = data;

  useEffect(() => {
    console.log('DashboardFlyout: subscribing to attachmentStore, attachmentId:', attachmentId);
    const subscription = attachmentStore.state.subscribe((state) => {
      console.log('DashboardFlyout: subscription received:', {
        stateAttachmentId: state?.attachmentId,
        expectedAttachmentId: attachmentId,
        hasData: !!state?.data,
      });
      if (state.data) {
        console.log('new version received');
        setData(state.data);
        setVersion((v) => v + 1);
      }
    });
    return () => subscription.unsubscribe();
  }, [attachmentStore, attachmentId]);

  const dashboardPanels = useMemo(() => {
    const markdownPanel = markdownContent ? buildMarkdownPanel(markdownContent) : undefined;
    const yOffset = markdownContent ? getMarkdownPanelHeight(markdownContent) : 0;
    const normalizedPanels = normalizePanels(panels ?? [], yOffset);
    return [...(markdownPanel ? [markdownPanel] : []), ...normalizedPanels];
  }, [panels, markdownContent]);

  const handleOpenInDashboard = useCallback(async () => {
    if (!share) return;

    const locator = share.url.locators.get(DASHBOARD_APP_LOCATOR);
    if (!locator) return;

    const locatorParams = {
      dashboardId: savedObjectId,
      panels: dashboardPanels,
      title,
      description,
      viewMode: 'edit' as const,
      time_range: { from: 'now-24h', to: 'now' },
    };

    await locator.navigate(locatorParams);
    onClose();
  }, [share, savedObjectId, dashboardPanels, title, description, onClose]);

  const getCreationOptions = useCallback(async () => {
    // If we have a savedObjectId, load from saved dashboard and just set viewMode
    // Otherwise, use by-value panels from the attachment data
    if (savedObjectId) {
      return {
        getInitialInput: () => ({
          viewMode: 'view' as const,
        }),
      };
    }

    return {
      getInitialInput: () => ({
        timeRange: { from: 'now-24h', to: 'now' },
        viewMode: 'view' as const,
        panels: dashboardPanels as DashboardState['panels'],
        title,
        description,
      }),
    };
  }, [savedObjectId, dashboardPanels, title, description]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id="dashboardFlyoutTitle">
                {title ||
                  i18n.translate('xpack.dashboardAgent.flyout.defaultTitle', {
                    defaultMessage: 'Dashboard Preview',
                  })}
              </h2>
            </EuiTitle>
            {description && (
              <EuiText size="s" color="subdued">
                {description}
              </EuiText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody
        css={css`
          .euiFlyoutBody__overflowContent {
            height: 100%;
            display: flex;
            flex-direction: column;
          }
        `}
      >
        <div
          css={css`
            flex: 1;
            min-height: 400px;
            height: 100%;
          `}
        >
          <DashboardRenderer
            key={version}
            getCreationOptions={getCreationOptions}
            showPlainSpinner
            savedObjectId={savedObjectId}
            onApiAvailable={(api) => {
              // Force view mode since DashboardRenderer defaults to edit when no savedObjectId
              api.setViewMode('view');
            }}
          />
        </div>
      </EuiFlyoutBody>

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
    </>
  );
};
