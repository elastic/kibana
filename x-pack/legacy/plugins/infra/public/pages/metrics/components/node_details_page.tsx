/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiHideFor,
  EuiTitle,
} from '@elastic/eui';
import { InfraTimerangeInput } from '../../../../common/http_api/snapshot_api';
import { InventoryMetric, InventoryItemType } from '../../../../common/inventory_models/types';
import { useNodeDetails } from '../../../containers/node_details/use_node_details';
import { MetricsSideNav } from './side_nav';
import { AutoSizer } from '../../../components/auto_sizer';
import { MetricsTimeControls } from './time_controls';
import { SideNavContext, NavItem } from '../lib/side_nav_context';
import { PageBody } from './page_body';
import euiStyled from '../../../../../../common/eui_styled_components';
import { MetricsTimeInput } from '../containers/with_metrics_time';
import { InfraMetadata } from '../../../../common/http_api/metadata_api';
import { PageError } from './page_error';
import { MetadataContext } from '../../../pages/metrics/containers/metadata_context';

interface Props {
  name: string;
  requiredMetrics: InventoryMetric[];
  nodeId: string;
  cloudId: string;
  nodeType: InventoryItemType;
  sourceId: string;
  timeRange: MetricsTimeInput;
  parsedTimeRange: InfraTimerangeInput;
  metadataLoading: boolean;
  isAutoReloading: boolean;
  refreshInterval: number;
  sideNav: NavItem[];
  metadata: InfraMetadata;
  addNavItem(item: NavItem): void;
  setRefreshInterval(refreshInterval: number): void;
  setAutoReload(isAutoReloading: boolean): void;
  triggerRefresh(): void;
  setTimeRange(timeRange: MetricsTimeInput): void;
}
export const NodeDetailsPage = (props: Props) => {
  const { parsedTimeRange } = props;
  const { metrics, loading, makeRequest, error } = useNodeDetails(
    props.requiredMetrics,
    props.nodeId,
    props.nodeType,
    props.sourceId,
    props.parsedTimeRange,
    props.cloudId
  );

  const refetch = useCallback(() => {
    makeRequest();
  }, [makeRequest]);

  useEffect(() => {
    makeRequest();
  }, [makeRequest, parsedTimeRange]);

  if (error) {
    return <PageError error={error} name={props.name} />;
  }

  return (
    <EuiPage style={{ flex: '1 0 auto' }}>
      <MetricsSideNav loading={props.metadataLoading} name={props.name} items={props.sideNav} />
      <AutoSizer content={false} bounds detectAnyWindowResize>
        {({ bounds: { width = 0 } }) => {
          const w = width ? `${width}px` : `100%`;
          return (
            <MetricsDetailsPageColumn>
              <EuiPageBody style={{ width: w }}>
                <EuiPageHeader style={{ flex: '0 0 auto' }}>
                  <EuiPageHeaderSection style={{ width: '100%' }}>
                    <MetricsTitleTimeRangeContainer>
                      <EuiHideFor sizes={['xs', 's']}>
                        <EuiTitle size="m">
                          <h1>{props.name}</h1>
                        </EuiTitle>
                      </EuiHideFor>
                      <MetricsTimeControls
                        currentTimeRange={props.timeRange}
                        isLiveStreaming={props.isAutoReloading}
                        refreshInterval={props.refreshInterval}
                        setRefreshInterval={props.setRefreshInterval}
                        onChangeTimeRange={props.setTimeRange}
                        setAutoReload={props.setAutoReload}
                        onRefresh={props.triggerRefresh}
                      />
                    </MetricsTitleTimeRangeContainer>
                  </EuiPageHeaderSection>
                </EuiPageHeader>
                <SideNavContext.Provider
                  value={{
                    items: props.sideNav,
                    addNavItem: props.addNavItem,
                  }}
                >
                  <MetadataContext.Provider value={props.metadata}>
                    <PageBody
                      loading={metrics.length > 0 && props.isAutoReloading ? false : loading}
                      refetch={refetch}
                      type={props.nodeType}
                      metrics={metrics}
                      onChangeRangeTime={props.setTimeRange}
                      isLiveStreaming={props.isAutoReloading}
                      stopLiveStreaming={() => props.setAutoReload(false)}
                    />
                  </MetadataContext.Provider>
                </SideNavContext.Provider>
              </EuiPageBody>
            </MetricsDetailsPageColumn>
          );
        }}
      </AutoSizer>
    </EuiPage>
  );
};

const MetricsDetailsPageColumn = euiStyled.div`
  flex: 1 0 0%;
  display: flex;
  flex-direction: column;
`;

const MetricsTitleTimeRangeContainer = euiStyled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`;
