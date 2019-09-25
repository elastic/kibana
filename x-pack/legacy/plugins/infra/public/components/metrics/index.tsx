/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPageContentBody, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { InfraTimerangeInput, InfraNodeType } from '../../graphql/types';
import { InfraMetricLayout, InfraMetricLayoutSection } from '../../pages/metrics/layouts/types';
import { NoData } from '../empty_states';
import { InfraLoadingPanel } from '../loading';
import { Section } from './section';
import { InfraMetricCombinedData } from '../../containers/metrics/with_metrics';
import { SourceConfiguration } from '../../utils/source_configuration';
import { MetricsTimeInput } from '../../containers/metrics/with_metrics_time';

interface Props {
  metrics: InfraMetricCombinedData[];
  layouts: InfraMetricLayout[];
  loading: boolean;
  refetch: () => void;
  label: string;
  onChangeRangeTime?: (time: MetricsTimeInput) => void;
  isLiveStreaming?: boolean;
  stopLiveStreaming?: () => void;
  nodeId: string;
  nodeType: InfraNodeType;
  sourceConfiguration: SourceConfiguration;
  timeRange: InfraTimerangeInput;
}

export const Metrics = class extends React.PureComponent<Props> {
  public static displayName = 'Metrics';

  public render() {
    if (this.props.loading) {
      return (
        <InfraLoadingPanel
          height="100vh"
          width="auto"
          text={i18n.translate('xpack.infra.metrics.loadingNodeDataText', {
            defaultMessage: 'Loading data',
          })}
        />
      );
    } else if (!this.props.loading && this.props.metrics && this.props.metrics.length === 0) {
      return (
        <NoData
          titleText={i18n.translate('xpack.infra.metrics.emptyViewTitle', {
            defaultMessage: 'There is no data to display.',
          })}
          bodyText={i18n.translate('xpack.infra.metrics.emptyViewDescription', {
            defaultMessage: 'Try adjusting your time or filter.',
          })}
          refetchText={i18n.translate('xpack.infra.metrics.refetchButtonLabel', {
            defaultMessage: 'Check for new data',
          })}
          onRefetch={this.handleRefetch}
          testString="metricsEmptyViewState"
        />
      );
    }

    return <React.Fragment>{this.props.layouts.map(this.renderLayout)}</React.Fragment>;
  }

  private handleRefetch = () => {
    this.props.refetch();
  };

  private renderLayout = (layout: InfraMetricLayout) => {
    return (
      <React.Fragment key={layout.id}>
        <EuiPageContentBody>
          <EuiTitle size="m">
            <h2 id={layout.id}>{layout.label}</h2>
          </EuiTitle>
        </EuiPageContentBody>
        {layout.sections.map(this.renderSection(layout))}
      </React.Fragment>
    );
  };

  private renderSection = (layout: InfraMetricLayout) => (section: InfraMetricLayoutSection) => {
    return (
      <Section
        section={section}
        metrics={this.props.metrics}
        key={`${layout.id}-${section.id}`}
        nodeId={this.props.nodeId}
        nodeType={this.props.nodeType}
        sourceConfiguration={this.props.sourceConfiguration}
        timeRange={this.props.timeRange}
        onChangeRangeTime={this.props.onChangeRangeTime}
        isLiveStreaming={this.props.isLiveStreaming}
        stopLiveStreaming={this.props.stopLiveStreaming}
      />
    );
  };
};
