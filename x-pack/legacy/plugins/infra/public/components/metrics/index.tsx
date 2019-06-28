/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPageContentBody, EuiTitle } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';

import { InfraMetricData, InfraTimerangeInput } from '../../graphql/types';
import { InfraMetricLayout, InfraMetricLayoutSection } from '../../pages/metrics/layouts/types';
import { NoData } from '../empty_states';
import { InfraLoadingPanel } from '../loading';
import { Section } from './section';

interface Props {
  metrics: InfraMetricData[];
  layouts: InfraMetricLayout[];
  loading: boolean;
  refetch: () => void;
  nodeId: string;
  label: string;
  onChangeRangeTime?: (time: InfraTimerangeInput) => void;
  isLiveStreaming?: boolean;
  stopLiveStreaming?: () => void;
  intl: InjectedIntl;
}

interface State {
  crosshairValue: number | null;
}

export const Metrics = injectI18n(
  class extends React.PureComponent<Props, State> {
    public static displayName = 'Metrics';
    public readonly state = {
      crosshairValue: null,
    };

    public render() {
      const { intl } = this.props;

      if (this.props.loading) {
        return (
          <InfraLoadingPanel
            height="100vh"
            width="auto"
            text={intl.formatMessage({
              id: 'xpack.infra.metrics.loadingNodeDataText',
              defaultMessage: 'Loading data',
            })}
          />
        );
      } else if (!this.props.loading && this.props.metrics && this.props.metrics.length === 0) {
        return (
          <NoData
            titleText={intl.formatMessage({
              id: 'xpack.infra.metrics.emptyViewTitle',
              defaultMessage: 'There is no data to display.',
            })}
            bodyText={intl.formatMessage({
              id: 'xpack.infra.metrics.emptyViewDescription',
              defaultMessage: 'Try adjusting your time or filter.',
            })}
            refetchText={intl.formatMessage({
              id: 'xpack.infra.metrics.refetchButtonLabel',
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
              <h2 id={layout.id}>
                <FormattedMessage
                  id="xpack.infra.metrics.layoutLabelOverviewTitle"
                  defaultMessage="{layoutLabel} Overview"
                  values={{
                    layoutLabel: layout.label,
                  }}
                />
              </h2>
            </EuiTitle>
          </EuiPageContentBody>
          {layout.sections.map(this.renderSection(layout))}
        </React.Fragment>
      );
    };

    private renderSection = (layout: InfraMetricLayout) => (section: InfraMetricLayoutSection) => {
      let sectionProps = {};
      if (section.type === 'chart') {
        const { onChangeRangeTime, isLiveStreaming, stopLiveStreaming } = this.props;
        sectionProps = {
          onChangeRangeTime,
          isLiveStreaming,
          stopLiveStreaming,
          crosshairValue: this.state.crosshairValue,
          onCrosshairUpdate: this.onCrosshairUpdate,
        };
      }
      return (
        <Section
          section={section}
          metrics={this.props.metrics}
          key={`${layout.id}-${section.id}`}
          {...sectionProps}
        />
      );
    };

    private onCrosshairUpdate = (crosshairValue: number) => {
      this.setState({
        crosshairValue,
      });
    };
  }
);
