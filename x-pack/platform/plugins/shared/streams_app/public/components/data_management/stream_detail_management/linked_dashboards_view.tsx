/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { usePerformanceContext } from '@kbn/ebt-tools';
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
import { getStreamTypeFromDefinition } from '../../../util/get_stream_type_from_definition';
import { useKibana } from '../../../hooks/use_kibana';
import { useAttachmentsFetch } from '../../../hooks/use_attachments_fetch';

const DASHBOARD_FILTERS = {
  attachmentTypes: ['dashboard' as const],
};

export function LinkedDashboardsView({ definition }: { definition: Streams.all.GetResponse }) {
  const context = useKibana();
  const { onPageReady } = usePerformanceContext();
  const attachmentsFetch = useAttachmentsFetch({
    streamName: definition.stream.name,
    filters: DASHBOARD_FILTERS,
  });
  const dashboardsLocator =
    context.dependencies.start.share.url.locators.get(DASHBOARD_APP_LOCATOR);
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);

  // Telemetry for TTFMP (time to first meaningful paint)
  useEffect(() => {
    if (attachmentsFetch.value && !attachmentsFetch.loading) {
      const streamType = getStreamTypeFromDefinition(definition.stream);
      onPageReady({
        meta: {
          description: `[ttfmp_streams_detail_processing] streamType: ${streamType}`,
        },
        customMetrics: {
          key1: 'linked_dashboards_count',
          value1: attachmentsFetch.value?.attachments.length ?? 0,
        },
      });
    }
  }, [attachmentsFetch.value, attachmentsFetch.loading, onPageReady, definition.stream]);

  if (attachmentsFetch.loading) {
    return <EuiLoadingSpinner />;
  }

  if (selectedDashboard === null && attachmentsFetch.value?.attachments.length) {
    setSelectedDashboard(attachmentsFetch.value.attachments[0].id);
  }

  return attachmentsFetch.value && attachmentsFetch.value.attachments.length ? (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <DashboardSelector
            dashboards={attachmentsFetch.value.attachments}
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
