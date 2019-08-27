/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { pure } from 'recompose';

import { HeaderPanel } from '../../../header_panel';
import { manageQuery } from '../../../page/manage_query';
import {
  ID as OverviewNetworkQueryId,
  OverviewNetworkQuery,
} from '../../../../containers/overview/overview_network';
import { inputsModel } from '../../../../store/inputs';
import { OverviewNetworkStats } from '../overview_network_stats';

export interface OwnProps {
  startDate: number;
  endDate: number;
  setQuery: ({
    id,
    inspect,
    loading,
    refetch,
  }: {
    id: string;
    inspect: inputsModel.InspectQuery | null;
    loading: boolean;
    refetch: inputsModel.Refetch;
  }) => void;
}

const OverviewNetworkStatsManage = manageQuery(OverviewNetworkStats);

export const OverviewNetwork = pure<OwnProps>(({ endDate, startDate, setQuery }) => {
  const [isHover, setIsHover] = useState(false);
  return (
    <EuiFlexItem>
      <EuiPanel onMouseEnter={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)}>
        <HeaderPanel
          border
          id={OverviewNetworkQueryId}
          showInspect={isHover}
          subtitle={
            <FormattedMessage
              id="xpack.siem.overview.networkSubtitle"
              defaultMessage="Showing: Last 24 hours"
            />
          }
          title={
            <FormattedMessage
              id="xpack.siem.overview.networkTitle"
              defaultMessage="Network events"
            />
          }
        >
          <EuiButton href="#/link-to/network/">
            <FormattedMessage
              id="xpack.siem.overview.networkAction"
              defaultMessage="View network"
            />
          </EuiButton>
        </HeaderPanel>

        <OverviewNetworkQuery endDate={endDate} sourceId="default" startDate={startDate}>
          {({ overviewNetwork, loading, id, inspect, refetch }) => (
            <OverviewNetworkStatsManage
              loading={loading}
              data={overviewNetwork}
              id={id}
              inspect={inspect}
              setQuery={setQuery}
              refetch={refetch}
            />
          )}
        </OverviewNetworkQuery>
      </EuiPanel>
    </EuiFlexItem>
  );
});

OverviewNetwork.displayName = 'OverviewNetwork';
