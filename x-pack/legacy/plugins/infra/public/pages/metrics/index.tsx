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
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { GraphQLFormattedError } from 'graphql';
import React, { useCallback, useContext } from 'react';
import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';
import euiStyled, { EuiTheme, withTheme } from '../../../../../common/eui_styled_components';
import { InfraMetricsErrorCodes } from '../../../common/errors';
import { AutoSizer } from '../../components/auto_sizer';
import { DocumentTitle } from '../../components/document_title';
import { Header } from '../../components/header';
import { Metrics } from '../../components/metrics';
import { InvalidNodeError } from '../../components/metrics/invalid_node';
import { MetricsSideNav } from '../../components/metrics/side_nav';
import { MetricsTimeControls } from '../../components/metrics/time_controls';
import { ColumnarPage, PageContent } from '../../components/page';
import { WithMetrics } from '../../containers/metrics/with_metrics';
import {
  WithMetricsTime,
  WithMetricsTimeUrlState,
} from '../../containers/metrics/with_metrics_time';
import { InfraNodeType } from '../../graphql/types';
import { Error, ErrorPageBody } from '../error';
import { layoutCreators } from './layouts';
import { InfraMetricLayoutSection } from './layouts/types';
import { withMetricPageProviders } from './page_providers';
import { useMetadata } from '../../containers/metadata/use_metadata';
import { Source } from '../../containers/source';
import { InfraLoadingPanel } from '../../components/loading';
import { NodeDetails } from '../../components/metrics/node_details';

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
  intl: InjectedIntl;
  uiCapabilities: UICapabilities;
}

export const MetricDetail = withMetricPageProviders(
  injectUICapabilities(
    withTheme(
      injectI18n(({ intl, uiCapabilities, match, theme }: Props) => {
        const nodeId = match.params.node;
        const nodeType = match.params.type as InfraNodeType;
        const layoutCreator = layoutCreators[nodeType];
        if (!layoutCreator) {
          return (
            <Error
              message={intl.formatMessage(
                {
                  id: 'xpack.infra.metricDetailPage.invalidNodeTypeErrorMessage',
                  defaultMessage: '{nodeType} is not a valid node type',
                },
                {
                  nodeType: `"${nodeType}"`,
                }
              )}
            />
          );
        }
        const { sourceId } = useContext(Source.Context);
        const layouts = layoutCreator(theme);
        const { name, filteredLayouts, loading: metadataLoading, cloudId, metadata } = useMetadata(
          nodeId,
          nodeType,
          layouts,
          sourceId
        );
        const breadcrumbs = [
          {
            href: '#/',
            text: intl.formatMessage({
              id: 'xpack.infra.header.infrastructureTitle',
              defaultMessage: 'Infrastructure',
            }),
          },
          { text: name },
        ];

        const handleClick = useCallback(
          (section: InfraMetricLayoutSection) => () => {
            const id = section.linkToId || section.id;
            const el = document.getElementById(id);
            if (el) {
              el.scrollIntoView();
            }
          },
          []
        );

        if (metadataLoading && !filteredLayouts.length) {
          return (
            <InfraLoadingPanel
              height="100vh"
              width="100%"
              text={intl.formatMessage({
                id: 'xpack.infra.metrics.loadingNodeDataText',
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
                  title={intl.formatMessage(
                    {
                      id: 'xpack.infra.metricDetailPage.documentTitle',
                      defaultMessage: 'Infrastructure | Metrics | {name}',
                    },
                    {
                      name,
                    }
                  )}
                />
                <DetailPageContent data-test-subj="infraMetricsPage">
                  <WithMetrics
                    layouts={filteredLayouts}
                    sourceId={sourceId}
                    timerange={parsedTimeRange}
                    nodeType={nodeType}
                    nodeId={nodeId}
                    cloudId={cloudId}
                  >
                    {({ metrics, error, loading, refetch }) => {
                      if (error) {
                        const invalidNodeError = error.graphQLErrors.some(
                          (err: GraphQLFormattedError) =>
                            err.code === InfraMetricsErrorCodes.invalid_node
                        );

                        return (
                          <>
                            <DocumentTitle
                              title={(previousTitle: string) =>
                                intl.formatMessage(
                                  {
                                    id: 'xpack.infra.metricDetailPage.documentTitleError',
                                    defaultMessage: '{previousTitle} | Uh oh',
                                  },
                                  {
                                    previousTitle,
                                  }
                                )
                              }
                            />
                            {invalidNodeError ? (
                              <InvalidNodeError nodeName={name} />
                            ) : (
                              <ErrorPageBody message={error.message} />
                            )}
                          </>
                        );
                      }
                      return (
                        <EuiPage style={{ flex: '1 0 auto' }}>
                          <MetricsSideNav
                            layouts={filteredLayouts}
                            loading={metadataLoading}
                            nodeName={name}
                            handleClick={handleClick}
                          />
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
                                      <Metrics
                                        label={name}
                                        nodeId={nodeId}
                                        layouts={filteredLayouts}
                                        metrics={metrics}
                                        loading={
                                          metrics.length > 0 && isAutoReloading ? false : loading
                                        }
                                        refetch={refetch}
                                        onChangeRangeTime={setTimeRange}
                                        isLiveStreaming={isAutoReloading}
                                        stopLiveStreaming={() => setAutoReload(false)}
                                      />
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
