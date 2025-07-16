/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSearchBar } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import type { SanitizedDashboardAsset } from '@kbn/streams-plugin/server/routes/dashboards/route';
import type { Streams } from '@kbn/streams-schema';
import React, { useMemo, useState } from 'react';
import { useDashboardsApi } from '../../hooks/use_dashboards_api';
import { useDashboardsFetch } from '../../hooks/use_dashboards_fetch';
import { useKibana } from '../../hooks/use_kibana';
import { AddDashboardFlyout } from './add_dashboard_flyout';
import { DashboardsTable } from './dashboard_table';

export function StreamDetailDashboardsView({
  definition,
}: {
  definition: Streams.ingest.all.GetResponse;
}) {
  const [query, setQuery] = useState('');

  const [isAddDashboardFlyoutOpen, setIsAddDashboardFlyoutOpen] = useState(false);

  const dashboardsFetch = useDashboardsFetch(definition.stream.name);
  const { addDashboards, removeDashboards } = useDashboardsApi(definition.stream.name);

  const [isUnlinkLoading, setIsUnlinkLoading] = useState(false);
  const linkedDashboards = useMemo(() => {
    return dashboardsFetch.value?.dashboards ?? [];
  }, [dashboardsFetch.value?.dashboards]);

  const filteredDashboards = useMemo(() => {
    return linkedDashboards.filter((dashboard) => {
      return dashboard.title.toLowerCase().includes(query.toLowerCase());
    });
  }, [linkedDashboards, query]);

  const [selectedDashboards, setSelectedDashboards] = useState<SanitizedDashboardAsset[]>([]);

  const {
    core: {
      application: {
        capabilities: {
          streams: { [STREAMS_UI_PRIVILEGES.manage]: canLinkAssets },
        },
      },
    },
  } = useKibana();

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="s">
          {selectedDashboards.length > 0 && (
            <EuiButton
              data-test-subj="streamsAppStreamDetailRemoveDashboardButton"
              iconType="trash"
              isLoading={isUnlinkLoading}
              onClick={async () => {
                try {
                  setIsUnlinkLoading(true);

                  await removeDashboards(selectedDashboards);
                  dashboardsFetch.refresh();

                  setSelectedDashboards([]);
                } finally {
                  setIsUnlinkLoading(false);
                }
              }}
              color="danger"
            >
              {i18n.translate('xpack.streams.streamDetailDashboardView.removeSelectedButtonLabel', {
                defaultMessage: 'Unlink selected',
              })}
            </EuiButton>
          )}
          <EuiSearchBar
            query={query}
            box={{
              incremental: true,
            }}
            onChange={(nextQuery) => {
              setQuery(nextQuery.queryText);
            }}
          />
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <DashboardsTable
          entityId={definition?.stream.name}
          dashboards={filteredDashboards}
          loading={dashboardsFetch.loading}
          selectedDashboards={selectedDashboards}
          setSelectedDashboards={canLinkAssets ? setSelectedDashboards : undefined}
          dataTestSubj="streamsAppStreamDetailDashboardsTable"
        />
        {definition && isAddDashboardFlyoutOpen ? (
          <AddDashboardFlyout
            linkedDashboards={linkedDashboards}
            entityId={definition.stream.name}
            onAddDashboards={async (dashboards) => {
              await addDashboards(dashboards);
              dashboardsFetch.refresh();
              setIsAddDashboardFlyoutOpen(false);
            }}
            onClose={() => {
              setIsAddDashboardFlyoutOpen(false);
            }}
          />
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
