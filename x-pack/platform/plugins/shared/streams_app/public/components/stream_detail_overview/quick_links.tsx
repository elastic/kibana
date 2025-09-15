/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { css } from '@emotion/css';
import type { SanitizedDashboardAsset } from '@kbn/streams-plugin/server/routes/dashboards/route';

import { Streams } from '@kbn/streams-schema';
import { useDashboardsFetch } from '../../hooks/use_dashboards_fetch';
import { AssetImage } from '../asset_image';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { DashboardsTable } from '../stream_detail_dashboards_view/dashboard_table';

const EMPTY_DASHBOARD_LIST: SanitizedDashboardAsset[] = [];

export function QuickLinks({ definition }: { definition: Streams.ingest.all.GetResponse }) {
  const router = useStreamsAppRouter();
  const dashboardsFetch = useDashboardsFetch(definition.stream.name);

  if (definition && !dashboardsFetch.loading && dashboardsFetch.value?.dashboards.length === 0) {
    return (
      <EuiFlexItem grow>
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem
            grow={false}
            className={css`
              max-width: 200px;
            `}
          >
            <EuiFlexGroup direction="column" gutterSize="s">
              <AssetImage type="quickLinksEmpty" />
              <EuiText size="xs" textAlign="center" color="subdued">
                {i18n.translate('xpack.streams.entityDetailOverview.linkDashboardsText', {
                  defaultMessage: 'Link dashboards to this stream for quick access',
                })}
              </EuiText>
              <EuiFlexGroup justifyContent="center">
                <EuiLink
                  href={router.link('/{key}/{tab}', {
                    path: {
                      key: definition.stream.name,
                      tab: 'dashboards',
                    },
                  })}
                >
                  {i18n.translate('xpack.streams.entityDetailOverview.addDashboardButton', {
                    defaultMessage: 'Add dashboards',
                  })}
                </EuiLink>
              </EuiFlexGroup>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  }

  return (
    <DashboardsTable
      dashboards={dashboardsFetch.value?.dashboards ?? EMPTY_DASHBOARD_LIST}
      loading={dashboardsFetch.loading}
    />
  );
}
