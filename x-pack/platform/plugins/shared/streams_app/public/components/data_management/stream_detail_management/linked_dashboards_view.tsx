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
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import type { SanitizedDashboardAsset } from '@kbn/streams-plugin/server/routes/dashboards/route';
import { i18n } from '@kbn/i18n';
import { useDashboardsFetch } from '../../../hooks/use_dashboards_fetch';

export function LinkedDashboardsView({ definition }: { definition: Streams.all.GetResponse }) {
  const dashboardsFetch = useDashboardsFetch(definition.stream.name);

  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);

  if (dashboardsFetch.loading) {
    return <EuiLoadingSpinner />;
  }

  if (selectedDashboard === null && dashboardsFetch.value?.dashboards.length) {
    setSelectedDashboard(dashboardsFetch.value.dashboards[0].id);
  }

  return dashboardsFetch.value && dashboardsFetch.value.dashboards.length ? (
    <>
      <DashboardSelector
        dashboards={dashboardsFetch.value.dashboards}
        onSelect={setSelectedDashboard}
        selectedDashboard={selectedDashboard}
      />
      <EuiSpacer size="xl" />
      {selectedDashboard && (
        <EuiPanel>
          <DashboardRenderer savedObjectId={selectedDashboard} />
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
  dashboards: SanitizedDashboardAsset[];
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
