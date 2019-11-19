/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiHideFor,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext, useState } from 'react';
import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';
import euiStyled, { EuiTheme, withTheme } from '../../../../../common/eui_styled_components';
import { AutoSizer } from '../../components/auto_sizer';
import { DocumentTitle } from '../../components/document_title';
import { Header } from '../../components/header';
import { MetricsSideNav } from './components/side_nav';
import { MetricsTimeControls } from './components/time_controls';
import { ColumnarPage, PageContent } from '../../components/page';
import { WithMetrics } from './containers/with_metrics';
import { WithMetricsTime, WithMetricsTimeUrlState } from './containers/with_metrics_time';
import { InfraNodeType } from '../../graphql/types';
import { withMetricPageProviders } from './page_providers';
import { useMetadata } from '../../containers/metadata/use_metadata';
import { Source } from '../../containers/source';
import { InfraLoadingPanel } from '../../components/loading';
import { NodeDetails } from './components/node_details';
import { findInventoryModel } from '../../../common/inventory_models';
import { PageError } from './components/page_error';
import { NavItem, SideNavContext } from './lib/side_nav_context';
import { PageBody } from './components/page_body';

const DetailPageContent = euiStyled(PageContent)`
  overflow: auto;
  background-color: ${props => props.theme.eui.euiColorLightestShade};
`;

const EuiPageContentWithRelative = euiStyled(EuiPageContent)`
  position: relative;
`;

interface Props {
  theme: EuiTheme;
  match: {
    params: {
      type: string;
      node: string;
    };
  };
  uiCapabilities: UICapabilities;
}

export const MetricDetail = withMetricPageProviders(
  injectUICapabilities(
    withTheme(({ uiCapabilities, match, theme }: Props) => {
      const nodeId = match.params.node;
      const nodeType = match.params.type as InfraNodeType;
      const inventoryModel = findInventoryModel(nodeType);
      const { sourceId } = useContext(Source.Context);
      const {
        name,
        filteredRequiredMetrics,
        loading: metadataLoading,
        cloudId,
        metadata,
      } = useMetadata(nodeId, nodeType, inventoryModel.requiredMetrics, sourceId);

      const [sideNav, setSideNav] = useState<NavItem[]>([]);

      const addNavItem = React.useCallback(
        (item: NavItem) => {
          if (!sideNav.some(n => n.id === item.id)) {
            setSideNav([item, ...sideNav]);
          }
        },
        [sideNav]
      );

      const breadcrumbs = [
        {
          href: '#/',
          text: i18n.translate('xpack.infra.header.infrastructureTitle', {
            defaultMessage: 'Metrics',
          }),
        },
        { text: name },
      ];

      if (metadataLoading && !filteredRequiredMetrics.length) {
        return (
          <InfraLoadingPanel
            height="100vh"
            width="100%"
            text={i18n.translate('xpack.infra.metrics.loadingNodeDataText', {
              defaultMessage: 'Loading data',
            })}
          />
        );
      }

      return (
        <WithMetricsTime>
          {({
            timeRange,
            parsedTimeRange,
            setTimeRange,
            refreshInterval,
            setRefreshInterval,
            isAutoReloading,
            setAutoReload,
            triggerRefresh,
          }) => (
            <ColumnarPage>
              <Header
                breadcrumbs={breadcrumbs}
                readOnlyBadge={!uiCapabilities.infrastructure.save}
              />
              <WithMetricsTimeUrlState />
              <DocumentTitle
                title={i18n.translate('xpack.infra.metricDetailPage.documentTitle', {
                  defaultMessage: 'Infrastructure | Metrics | {name}',
                  values: {
                    name,
                  },
                })}
              />
              <DetailPageContent data-test-subj="infraMetricsPage">
                <WithMetrics
                  requiredMetrics={filteredRequiredMetrics}
                  sourceId={sourceId}
                  timerange={parsedTimeRange}
                  nodeType={nodeType}
                  nodeId={nodeId}
                  cloudId={cloudId}
                >
                  {({ metrics, error, loading, refetch }) => {
                    if (error) {
                      return <PageError error={error} name={name} />;
                    }
                    return (
                      <EuiPage style={{ flex: '1 0 auto' }}>
                        <MetricsSideNav loading={metadataLoading} name={name} items={sideNav} />
                        <AutoSizer content={false} bounds detectAnyWindowResize>
                          {({ measureRef, bounds: { width = 0 } }) => {
                            const w = width ? `${width}px` : `100%`;
                            return (
                              <MetricsDetailsPageColumn innerRef={measureRef}>
                                <EuiPageBody style={{ width: w }}>
                                  <EuiPageHeader style={{ flex: '0 0 auto' }}>
                                    <EuiPageHeaderSection style={{ width: '100%' }}>
                                      <MetricsTitleTimeRangeContainer>
                                        <EuiHideFor sizes={['xs', 's']}>
                                          <EuiTitle size="m">
                                            <h1>{name}</h1>
                                          </EuiTitle>
                                        </EuiHideFor>
                                        <MetricsTimeControls
                                          currentTimeRange={timeRange}
                                          isLiveStreaming={isAutoReloading}
                                          refreshInterval={refreshInterval}
                                          setRefreshInterval={setRefreshInterval}
                                          onChangeTimeRange={setTimeRange}
                                          setAutoReload={setAutoReload}
                                          onRefresh={triggerRefresh}
                                        />
                                      </MetricsTitleTimeRangeContainer>
                                    </EuiPageHeaderSection>
                                  </EuiPageHeader>
                                  <NodeDetails metadata={metadata} />
                                  <EuiPageContentWithRelative>
                                    <SideNavContext.Provider value={{ items: sideNav, addNavItem }}>
                                      <PageBody
                                        loading={
                                          metrics.length > 0 && isAutoReloading ? false : loading
                                        }
                                        refetch={refetch}
                                        type={nodeType}
                                        metrics={metrics}
                                        onChangeRangeTime={setTimeRange}
                                        isLiveStreaming={isAutoReloading}
                                        stopLiveStreaming={() => setAutoReload(false)}
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
                  }}
                </WithMetrics>
              </DetailPageContent>
            </ColumnarPage>
          )}
        </WithMetricsTime>
      );
    })
  )
);

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
