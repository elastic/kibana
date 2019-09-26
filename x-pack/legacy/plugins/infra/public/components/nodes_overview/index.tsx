/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { get, max, min } from 'lodash';
import React from 'react';

import euiStyled from '../../../../../common/eui_styled_components';
import {
  InfraSnapshotMetricType,
  InfraSnapshotNode,
  InfraNodeType,
  InfraTimerangeInput,
} from '../../graphql/types';
import { InfraFormatterType, InfraWaffleMapBounds, InfraWaffleMapOptions } from '../../lib/lib';
import { KueryFilterQuery } from '../../store/local/waffle_filter';
import { createFormatter } from '../../utils/formatters';
import { NoData } from '../empty_states';
import { InfraLoadingPanel } from '../loading';
import { Map } from '../waffle/map';
import { ViewSwitcher } from '../waffle/view_switcher';
import { TableView } from './table';

interface Props {
  options: InfraWaffleMapOptions;
  nodeType: InfraNodeType;
  nodes: InfraSnapshotNode[];
  loading: boolean;
  reload: () => void;
  onDrilldown: (filter: KueryFilterQuery) => void;
  timeRange: InfraTimerangeInput;
  onViewChange: (view: string) => void;
  view: string;
  boundsOverride: InfraWaffleMapBounds;
  autoBounds: boolean;
}

interface MetricFormatter {
  formatter: InfraFormatterType;
  template: string;
  bounds?: { min: number; max: number };
}

interface MetricFormatters {
  [key: string]: MetricFormatter;
}

const METRIC_FORMATTERS: MetricFormatters = {
  [InfraSnapshotMetricType.count]: { formatter: InfraFormatterType.number, template: '{{value}}' },
  [InfraSnapshotMetricType.cpu]: {
    formatter: InfraFormatterType.percent,
    template: '{{value}}',
  },
  [InfraSnapshotMetricType.memory]: {
    formatter: InfraFormatterType.percent,
    template: '{{value}}',
  },
  [InfraSnapshotMetricType.rx]: { formatter: InfraFormatterType.bits, template: '{{value}}/s' },
  [InfraSnapshotMetricType.tx]: { formatter: InfraFormatterType.bits, template: '{{value}}/s' },
  [InfraSnapshotMetricType.logRate]: {
    formatter: InfraFormatterType.abbreviatedNumber,
    template: '{{value}}/s',
  },
};

const calculateBoundsFromNodes = (nodes: InfraSnapshotNode[]): InfraWaffleMapBounds => {
  const maxValues = nodes.map(node => node.metric.max);
  const minValues = nodes.map(node => node.metric.value);
  // if there is only one value then we need to set the bottom range to zero for min
  // otherwise the legend will look silly since both values are the same for top and
  // bottom.
  if (minValues.length === 1) {
    minValues.unshift(0);
  }
  return { min: min(minValues) || 0, max: max(maxValues) || 0 };
};

export const NodesOverview = class extends React.Component<Props, {}> {
  public static displayName = 'Waffle';
  public render() {
    const {
      autoBounds,
      boundsOverride,
      loading,
      nodes,
      nodeType,
      reload,
      view,
      options,
      timeRange,
    } = this.props;
    if (loading) {
      return (
        <InfraLoadingPanel
          height="100%"
          width="100%"
          text={i18n.translate('xpack.infra.waffle.loadingDataText', {
            defaultMessage: 'Loading data',
          })}
        />
      );
    } else if (!loading && nodes && nodes.length === 0) {
      return (
        <NoData
          titleText={i18n.translate('xpack.infra.waffle.noDataTitle', {
            defaultMessage: 'There is no data to display.',
          })}
          bodyText={i18n.translate('xpack.infra.waffle.noDataDescription', {
            defaultMessage: 'Try adjusting your time or filter.',
          })}
          refetchText={i18n.translate('xpack.infra.waffle.checkNewDataButtonLabel', {
            defaultMessage: 'Check for new data',
          })}
          onRefetch={() => {
            reload();
          }}
          testString="noMetricsDataPrompt"
        />
      );
    }
    const dataBounds = calculateBoundsFromNodes(nodes);
    const bounds = autoBounds ? dataBounds : boundsOverride;
    return (
      <MainContainer>
        <ViewSwitcherContainer>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <ViewSwitcher view={view} onChange={this.handleViewChange} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued">
                <p>
                  <FormattedMessage
                    id="xpack.infra.homePage.toolbar.showingLastOneMinuteDataText"
                    defaultMessage="Showing the last 1 minute of data at the selected time"
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </ViewSwitcherContainer>
        {view === 'table' ? (
          <TableContainer>
            <TableView
              nodeType={nodeType}
              nodes={nodes}
              options={options}
              formatter={this.formatter}
              timeRange={timeRange}
              onFilter={this.handleDrilldown}
            />
          </TableContainer>
        ) : (
          <MapContainer>
            <Map
              nodeType={nodeType}
              nodes={nodes}
              options={options}
              formatter={this.formatter}
              timeRange={timeRange}
              onFilter={this.handleDrilldown}
              bounds={bounds}
              dataBounds={dataBounds}
            />
          </MapContainer>
        )}
      </MainContainer>
    );
  }

  private handleViewChange = (view: string) => this.props.onViewChange(view);

  // TODO: Change this to a real implimentation using the tickFormatter from the prototype as an example.
  private formatter = (val: string | number) => {
    const { metric } = this.props.options;
    const metricFormatter = get(
      METRIC_FORMATTERS,
      metric.type,
      METRIC_FORMATTERS[InfraSnapshotMetricType.count]
    );
    if (val == null) {
      return '';
    }
    const formatter = createFormatter(metricFormatter.formatter, metricFormatter.template);
    return formatter(val);
  };

  private handleDrilldown = (filter: string) => {
    this.props.onDrilldown({
      kind: 'kuery',
      expression: filter,
    });
    return;
  };
};

const MainContainer = euiStyled.div`
  position: relative;
  flex: 1 1 auto;
`;

const TableContainer = euiStyled.div`
  padding: ${props => props.theme.eui.paddingSizes.l};
`;

const ViewSwitcherContainer = euiStyled.div`
  padding: ${props => props.theme.eui.paddingSizes.l};
`;

const MapContainer = euiStyled.div`
  position: absolute;
  display: flex;
  top: 70px;
  right: 0;
  bottom: 0;
  left: 0;
`;
