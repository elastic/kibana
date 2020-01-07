/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState, useCallback } from 'react';

import { HeaderSection } from '../../../header_section';
import { manageQuery } from '../../../page/manage_query';
import {
  ID as OverviewHostQueryId,
  OverviewHostQuery,
} from '../../../../containers/overview/overview_host';
import { inputsModel } from '../../../../store/inputs';
import { OverviewHostStats } from '../overview_host_stats';
import { getHostsUrl } from '../../../link_to';

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
export const OverviewHost = React.memo<OverviewHostProps>(({ endDate, startDate, setQuery }) => {
  const [isHover, setIsHover] = useState(false);
  const handleMouseEnter = useCallback(() => setIsHover(true), [setIsHover]);
  const handleMouseLeave = useCallback(() => setIsHover(false), [setIsHover]);

  return (
    <EuiFlexItem>
      <EuiPanel onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <HeaderSection
          id={OverviewHostQueryId}
          showInspect={isHover}
          subtitle={
            <FormattedMessage
              defaultMessage="Showing: Last 24 hours"
              id="xpack.siem.overview.hostsSubtitle"
            />
          }
          title={
            <FormattedMessage defaultMessage="Host events" id="xpack.siem.overview.hostsTitle" />
          }
          border
        >
          <EuiButton href={getHostsUrl()}>
            <FormattedMessage defaultMessage="View hosts" id="xpack.siem.overview.hostsAction" />
          </EuiButton>
        </HeaderSection>

        <OverviewHostQuery endDate={endDate} sourceId="default" startDate={startDate}>
          {({ overviewHost, loading, id, inspect, refetch }) => (
            <OverviewHostStatsManage
              data={overviewHost}
              id={id}
              inspect={inspect}
              loading={loading}
              refetch={refetch}
              setQuery={setQuery}
            />
          )}
        </OverviewHostQuery>
      </EuiPanel>
    </EuiFlexItem>
  );
});

OverviewHost.displayName = 'OverviewHost';
