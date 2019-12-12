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
  EuiPageContent,
} from '@elastic/eui';
import { InventoryMetric } from '../../../../common/inventory_models/types';
import { useNodeDetails } from '../../../containers/node_details/use_node_details';
import { InfraNodeType, InfraTimerangeInput } from '../../../graphql/types';
import { MetricsSideNav } from './side_nav';
import { AutoSizer } from '../../../components/auto_sizer';
import { MetricsTimeControls } from './time_controls';
import { NodeDetails } from './node_details';
import { SideNavContext, NavItem } from '../lib/side_nav_context';
import { PageBody } from './page_body';
import euiStyled from '../../../../../../common/eui_styled_components';
import { MetricsTimeInput } from '../containers/with_metrics_time';
import { InfraMetadata } from '../../../../common/http_api/metadata_api';
import { PageError } from './page_error';

interface Props {
  name: string;
  requiredMetrics: InventoryMetric[];
  nodeId: string;
  cloudId: string;
  nodeType: InfraNodeType;
  sourceId: string;
  timeRange: MetricsTimeInput;
  parsedTimeRange: InfraTimerangeInput;
  metadataLoading: boolean;
  isAutoReloading: boolean;
  refreshInterval: number;
  sideNav: NavItem[];
  metadata: InfraMetadata | null;
  addNavItem(item: NavItem): void;
  setRefreshInterval(refreshInterval: number): void;
  setAutoReload(isAutoReloading: boolean): void;
  triggerRefresh(): void;
  setTimeRange(timeRange: MetricsTimeInput): void;
}
export const NodeDetailsPage = (props: Props) => {
  if (!props.metadata) {
    return null;
  }

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
  }, []);

  useEffect(() => {
    makeRequest();
  }, [parsedTimeRange]);

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
                <NodeDetails metadata={props.metadata} />
                <EuiPageContentWithRelative>
                  <SideNavContext.Provider
                    value={{
                      items: props.sideNav,
                      addNavItem: props.addNavItem,
                    }}
                  >
                    <PageBody
                      loading={metrics.length > 0 && props.isAutoReloading ? false : loading}
                      refetch={refetch}
                      type={props.nodeType}
                      metrics={metrics}
                      onChangeRangeTime={props.setTimeRange}
                      isLiveStreaming={props.isAutoReloading}
                      stopLiveStreaming={() => props.setAutoReload(false)}
                    />
                  </SideNavContext.Provider>
                </EuiPageContentWithRelative>
              </EuiPageBody>
            </MetricsDetailsPageColumn>
          );
        }}
      </AutoSizer>
    </EuiPage>
  );
};

const EuiPageContentWithRelative = euiStyled(EuiPageContent)`
  position: relative;
`;

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
