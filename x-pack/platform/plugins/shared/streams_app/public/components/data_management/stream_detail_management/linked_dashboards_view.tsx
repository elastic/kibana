/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import type { Streams } from '@kbn/streams-schema';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import type { Attachment } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import { i18n } from '@kbn/i18n';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useKibana } from '../../../hooks/use_kibana';
import { useDashboardsFetch } from '../../../hooks/use_dashboards_fetch';

export function LinkedDashboardsView({ definition }: { definition: Streams.all.GetResponse }) {
  const context = useKibana();
  const dashboardsFetch = useDashboardsFetch(definition.stream.name);
  const dashboardsLocator =
    context.dependencies.start.share.url.locators.get(DASHBOARD_APP_LOCATOR);
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);

  if (dashboardsFetch.loading) {
    return <EuiLoadingSpinner />;
  }

  if (selectedDashboard === null && dashboardsFetch.value?.dashboards.length) {
    setSelectedDashboard(dashboardsFetch.value.dashboards[0].id);
  }

  return dashboardsFetch.value && dashboardsFetch.value.dashboards.length ? (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <DashboardSelector
            dashboards={dashboardsFetch.value.dashboards}
            onSelect={setSelectedDashboard}
            selectedDashboard={selectedDashboard}
          />
        </EuiFlexItem>
        {dashboardsLocator && (
          <EuiFlexItem grow={false}>
            <EuiButton href={dashboardsLocator.getRedirectUrl({ dashboardId: selectedDashboard })}>
              {i18n.translate('xpack.streams.linkedDashboardsView.openInDashboardsButtonLabel', {
                defaultMessage: 'Open in Dashboards',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
      {selectedDashboard && (
        <EuiPanel>
          <DashboardRenderer
            savedObjectId={selectedDashboard}
            getCreationOptions={async () => ({
              getInitialInput: () => ({
                viewMode: 'view',
                timeRange: { from: 'now-15m', to: 'now' },
              }),
            })}
          />
        </EuiPanel>
      )}
    </>
  ) : (
    i18n.translate('xpack.streams.linkedDashboardsView.noLinkedDashboardsLabel', {
      defaultMessage: 'No linked dashboards',
    })
  );
}

function DashboardSelector({
  dashboards,
  onSelect,
  selectedDashboard,
}: {
  dashboards: Attachment[];
  onSelect: (id: string) => void;
  selectedDashboard: string | null;
}) {
  return (
    <EuiListGroup bordered={true}>
      {dashboards.map((dashboard) => (
        <EuiListGroupItem
          key={dashboard.id}
          label={dashboard.title}
          onClick={() => onSelect(dashboard.id)}
          isActive={dashboard.id === selectedDashboard}
        />
      ))}
    </EuiListGroup>
  );
}
