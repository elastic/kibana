/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { EuiButton, EuiFlexItem, EuiPanel } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { DEFAULT_NUMBER_FORMAT } from '../../../../../common/constants';
import { ESQuery } from '../../../../../common/typed_json';
import { HeaderSection } from '../../../header_section';
import { useUiSetting$ } from '../../../../lib/kibana';
import { manageQuery } from '../../../page/manage_query';
import {
  ID as OverviewNetworkQueryId,
  OverviewNetworkQuery,
} from '../../../../containers/overview/overview_network';
import { inputsModel } from '../../../../store/inputs';
import { getOverviewNetworkStats, OverviewNetworkStats } from '../overview_network_stats';
import { getNetworkUrl } from '../../../link_to';
import { InspectButtonContainer } from '../../../inspect';

export interface OverviewNetworkProps {
  startDate: number;
  endDate: number;
  filterQuery?: ESQuery | string;
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

const OverviewNetworkComponent: React.FC<OverviewNetworkProps> = ({
  endDate,
  filterQuery,
  startDate,
  setQuery,
}) => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  return (
    <EuiFlexItem>
      <InspectButtonContainer>
        <EuiPanel>
          <OverviewNetworkQuery
            data-test-subj="overview-network-query"
            endDate={endDate}
            filterQuery={filterQuery}
            sourceId="default"
            startDate={startDate}
          >
            {({ overviewNetwork, loading, id, inspect, refetch }) => {
              const networkEventsCount = getOverviewNetworkStats(overviewNetwork).reduce(
                (total, stat) => total + stat.count,
                0
              );
              const formattedNetworkEventsCount = numeral(networkEventsCount).format(
                defaultNumberFormat
              );

              return (
                <>
                  <HeaderSection
                    id={OverviewNetworkQueryId}
                    subtitle={
                      !isEmpty(overviewNetwork) ? (
                        <FormattedMessage
                          defaultMessage="Showing: {formattedNetworkEventsCount} {networkEventsCount, plural, one {event} other {events}}"
                          id="xpack.siem.overview.overviewNetwork.networkSubtitle"
                          values={{
                            formattedNetworkEventsCount,
                            networkEventsCount,
                          }}
                        />
                      ) : (
                        <>{''}</>
                      )
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

                  <OverviewNetworkStatsManage
                    loading={loading}
                    data={overviewNetwork}
                    id={id}
                    inspect={inspect}
                    setQuery={setQuery}
                    refetch={refetch}
                  />
                </>
              );
            }}
          </OverviewNetworkQuery>
        </EuiPanel>
      </InspectButtonContainer>
    </EuiFlexItem>
  );
};

OverviewNetworkComponent.displayName = 'OverviewNetworkComponent';

export const OverviewNetwork = React.memo(OverviewNetworkComponent);
