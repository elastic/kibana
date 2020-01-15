/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { HeaderSection } from '../../../header_section';
import { manageQuery } from '../../../page/manage_query';
import {
  ID as OverviewNetworkQueryId,
  OverviewNetworkQuery,
} from '../../../../containers/overview/overview_network';
import { inputsModel } from '../../../../store/inputs';
import { OverviewNetworkStats } from '../overview_network_stats';
import { getNetworkUrl } from '../../../link_to';
import { InspectButtonContainer } from '../../../inspect';

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

const OverviewNetworkComponent: React.FC<OwnProps> = ({ endDate, startDate, setQuery }) => (
  <EuiFlexItem>
    <InspectButtonContainer>
      <EuiPanel>
        <HeaderSection
          border
          id={OverviewNetworkQueryId}
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
          <EuiButton href={getNetworkUrl()}>
            <FormattedMessage
              id="xpack.siem.overview.networkAction"
              defaultMessage="View network"
            />
          </EuiButton>
        </HeaderSection>

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
    </InspectButtonContainer>
  </EuiFlexItem>
);

export const OverviewNetwork = React.memo(OverviewNetworkComponent);
