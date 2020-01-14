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
  ID as OverviewHostQueryId,
  OverviewHostQuery,
} from '../../../../containers/overview/overview_host';
import { inputsModel } from '../../../../store/inputs';
import { OverviewHostStats } from '../overview_host_stats';
import { getHostsUrl } from '../../../link_to';
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

const OverviewHostStatsManage = manageQuery(OverviewHostStats);
type OverviewHostProps = OwnProps;

const OverviewHostComponent: React.FC<OverviewHostProps> = ({ endDate, startDate, setQuery }) => (
  <EuiFlexItem>
    <InspectButtonContainer>
      <EuiPanel>
        <HeaderSection
          border
          id={OverviewHostQueryId}
          subtitle={
            <FormattedMessage
              id="xpack.siem.overview.hostsSubtitle"
              defaultMessage="Showing: Last 24 hours"
            />
          }
          title={
            <FormattedMessage id="xpack.siem.overview.hostsTitle" defaultMessage="Host events" />
          }
        >
          <EuiButton href={getHostsUrl()}>
            <FormattedMessage id="xpack.siem.overview.hostsAction" defaultMessage="View hosts" />
          </EuiButton>
        </HeaderSection>

        <OverviewHostQuery endDate={endDate} sourceId="default" startDate={startDate}>
          {({ overviewHost, loading, id, inspect, refetch }) => (
            <OverviewHostStatsManage
              loading={loading}
              data={overviewHost}
              setQuery={setQuery}
              id={id}
              inspect={inspect}
              refetch={refetch}
            />
          )}
        </OverviewHostQuery>
      </EuiPanel>
    </InspectButtonContainer>
  </EuiFlexItem>
);

export const OverviewHost = React.memo(OverviewHostComponent);
