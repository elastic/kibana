/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import React, { useCallback, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import { useKibana } from '../../../../../hooks/use_kibana';
import { STREAM_METRICS_EMBEDDABLE_ID } from '../../../../../../common/embeddable';
import type { DashboardWithStreamPanel } from './use_dashboard_panels';
import { useDashboardPanels } from './use_dashboard_panels';

interface AddToDashboardFlyoutProps {
  streamName: string;
  onClose: () => void;
}

export function AddToDashboardFlyout({ streamName, onClose }: AddToDashboardFlyoutProps) {
  const {
    core: { http, notifications },
    dependencies: {
      start: { share },
    },
  } = useKibana();

  const {
    dashboards,
    dashboardsWithPanel,
    isLoading,
    isLoadingWithPanel,
    searchDashboards,
    refreshDashboardsWithPanel,
  } = useDashboardPanels({ streamName });

  const [selectedDashboard, setSelectedDashboard] = useState<
    EuiComboBoxOptionOption<string> | undefined
  >(undefined);
  const [isAddingPanel, setIsAddingPanel] = useState(false);

  const dashboardLocator = share.url.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);

  // Filter out dashboards that already have the panel
  const availableDashboards = useMemo(() => {
    const dashboardsWithPanelIds = new Set(dashboardsWithPanel.map((d) => d.id));
    return dashboards.filter((d) => !dashboardsWithPanelIds.has(d.id));
  }, [dashboards, dashboardsWithPanel]);

  const dashboardOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    return availableDashboards.map((d) => ({
      label: d.title,
      value: d.id,
    }));
  }, [availableDashboards]);

  const debouncedSearch = useMemo(
    () => debounce((term: string) => searchDashboards(term), 300),
    [searchDashboards]
  );

  const handleAddToDashboard = useCallback(async () => {
    if (!selectedDashboard?.value) return;

    setIsAddingPanel(true);

    try {
      // Get the current dashboard
      const dashboardResponse = await http.get<{
        data: {
          title: string;
          panels?: Array<{
            type: string;
            grid: { x: number; y: number; w: number; h: number };
            config: Record<string, unknown>;
            uid?: string;
          }>;
          [key: string]: unknown;
        };
      }>(`/api/dashboards/${selectedDashboard.value}`, {
        version: '1',
        query: { allowUnmappedKeys: true },
      });

      const existingPanels = dashboardResponse.data.panels || [];

      // Calculate position for new panel (add at the bottom)
      const maxY = existingPanels.reduce((max, panel) => {
        const panelBottom = (panel.grid?.y || 0) + (panel.grid?.h || 0);
        return Math.max(max, panelBottom);
      }, 0);

      // Generate a unique panel ID
      const newPanelId = `stream-metrics-${Date.now()}`;

      // Create the new panel configuration using the correct schema format
      const newPanel = {
        type: STREAM_METRICS_EMBEDDABLE_ID,
        grid: {
          x: 0,
          y: maxY,
          w: 48,
          h: 15,
        },
        config: {
          streamName,
          title: i18n.translate('xpack.streams.addToDashboard.panelTitle', {
            defaultMessage: 'Stream Metrics: {streamName}',
            values: { streamName },
          }),
        },
        uid: newPanelId,
      };

      // Update the dashboard with the new panel
      await http.put(`/api/dashboards/${selectedDashboard.value}`, {
        version: '1',
        query: { allowUnmappedKeys: true },
        body: JSON.stringify({
          data: {
            ...dashboardResponse.data,
            panels: [...existingPanels, newPanel],
          },
        }),
      });

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.addToDashboard.successTitle', {
          defaultMessage: 'Panel added to dashboard',
        }),
        text: i18n.translate('xpack.streams.addToDashboard.successText', {
          defaultMessage: 'Stream metrics panel was added to "{dashboardTitle}".',
          values: { dashboardTitle: selectedDashboard.label },
        }),
      });

      // Refresh the list of dashboards with the panel
      refreshDashboardsWithPanel();
      setSelectedDashboard(undefined);
    } catch (e) {
      notifications.toasts.addError(e as Error, {
        title: i18n.translate('xpack.streams.addToDashboard.errorTitle', {
          defaultMessage: 'Failed to add panel to dashboard',
        }),
      });
    } finally {
      setIsAddingPanel(false);
    }
  }, [selectedDashboard, http, notifications, streamName, refreshDashboardsWithPanel]);

  const getDashboardUrl = useCallback(
    (dashboardId: string) => {
      return dashboardLocator?.getRedirectUrl({ dashboardId });
    },
    [dashboardLocator]
  );

  const columns = [
    {
      field: 'title',
      name: i18n.translate('xpack.streams.addToDashboard.dashboardColumn', {
        defaultMessage: 'Dashboard',
      }),
      render: (title: string, item: DashboardWithStreamPanel) => {
        const url = getDashboardUrl(item.id);
        return url ? (
          <EuiLink href={url} target="_blank">
            {title}
          </EuiLink>
        ) : (
          title
        );
      },
    },
  ];

  return (
    <EuiFlyout onClose={onClose} size="m" data-test-subj="addToDashboardFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.streams.addToDashboard.flyoutTitle', {
              defaultMessage: 'Add to Dashboard',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.streams.addToDashboard.flyoutDescription', {
            defaultMessage:
              'Add a Stream Metrics visualization panel for "{streamName}" to a dashboard.',
            values: { streamName },
          })}
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow={false}>
            <EuiFormRow
              label={i18n.translate('xpack.streams.addToDashboard.selectDashboardLabel', {
                defaultMessage: 'Select dashboard',
              })}
              fullWidth
            >
              <EuiComboBox
                placeholder={i18n.translate(
                  'xpack.streams.addToDashboard.selectDashboardPlaceholder',
                  {
                    defaultMessage: 'Search and select a dashboard',
                  }
                )}
                singleSelection={{ asPlainText: true }}
                options={dashboardOptions}
                selectedOptions={selectedDashboard ? [selectedDashboard] : []}
                onChange={(selected) => setSelectedDashboard(selected[0])}
                onSearchChange={debouncedSearch}
                isLoading={isLoading}
                fullWidth
                data-test-subj="addToDashboardDashboardSelector"
              />
            </EuiFormRow>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiSpacer size="m" />
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.streams.addToDashboard.existingDashboardsTitle', {
                  defaultMessage: 'Dashboards with this stream panel',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.streams.addToDashboard.existingDashboardsDescription', {
                defaultMessage:
                  'These dashboards already have a Stream Metrics panel for "{streamName}".',
                values: { streamName },
              })}
            </EuiText>
            <EuiSpacer size="s" />
            {dashboardsWithPanel.length === 0 && !isLoadingWithPanel ? (
              <EuiCallOut
                size="s"
                title={i18n.translate('xpack.streams.addToDashboard.noDashboardsWithPanel', {
                  defaultMessage: 'No dashboards found with this stream panel',
                })}
                color="primary"
              />
            ) : (
              <EuiBasicTable
                items={dashboardsWithPanel}
                columns={columns}
                loading={isLoadingWithPanel}
                data-test-subj="dashboardsWithPanelTable"
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="addToDashboardCancelButton">
              {i18n.translate('xpack.streams.addToDashboard.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleAddToDashboard}
              disabled={!selectedDashboard || isAddingPanel}
              isLoading={isAddingPanel}
              data-test-subj="addToDashboardConfirmButton"
            >
              {i18n.translate('xpack.streams.addToDashboard.addButton', {
                defaultMessage: 'Add to Dashboard',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
