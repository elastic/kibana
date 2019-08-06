/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiPageContentBody, EuiTitle, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InfraMetricLayoutSection } from '../../../pages/metrics/layouts/types';
import { InfraTimerangeInput, InfraNodeType } from '../../../graphql/types';
import { isInfraApmMetrics } from '../../../utils/is_infra_metric_data';
import { InfraMetricCombinedData } from '../../../containers/metrics/with_metrics';
import { createFormatter } from '../../../utils/formatters';
import { InfraFormatterType } from '../../../lib/lib';
import { MetricSummary, MetricSummaryItem } from './metric_summary';
import { ApmChart } from './apm_chart';
import { SourceConfiguration } from '../../../utils/source_configuration';
import { createAPMServiceLink } from './helpers/create_apm_service_link';

interface Props {
  section: InfraMetricLayoutSection;
  metric: InfraMetricCombinedData;
  onChangeRangeTime?: (time: InfraTimerangeInput) => void;
  isLiveStreaming?: boolean;
  stopLiveStreaming?: () => void;
  nodeId: string;
  nodeType: InfraNodeType;
  sourceConfiguration: SourceConfiguration;
  timeRange: InfraTimerangeInput;
}

export const ApmSection = ({
  metric,
  section,
  onChangeRangeTime,
  isLiveStreaming,
  stopLiveStreaming,
  nodeId,
  nodeType,
  sourceConfiguration,
  timeRange,
}: Props) => {
  if (!isInfraApmMetrics(metric)) {
    throw new Error('ApmSection requires InfraApmMetrics');
  }
  const numberFormatter = createFormatter(InfraFormatterType.number);
  return (
    <EuiPageContentBody>
      {metric.services.map(service => (
        <React.Fragment key={service.id}>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={1}>
              <EuiTitle size="s">
                <h2 id={service.id}>
                  {i18n.translate('xpack.infra.apmSection.serviceLavel', {
                    defaultMessage: 'Service: {id}',
                    values: { id: service.id },
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink
                href={createAPMServiceLink(
                  service.id,
                  nodeId,
                  nodeType,
                  sourceConfiguration,
                  timeRange
                )}
              >
                View in APM
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
          <MetricSummary>
            <MetricSummaryItem
              label={i18n.translate('xpack.infra.apmSection.metricSummary.agentLabel', {
                defaultMessage: 'Agent',
              })}
              value={service.agentName}
            />
            <MetricSummaryItem
              label={i18n.translate('xpack.infra.apmSection.metricSummary.responseTimeLabel', {
                defaultMessage: 'Avg. Response Time',
              })}
              value={`${numberFormatter(service.avgResponseTime / 1000)} ms`}
            />
            <MetricSummaryItem
              label={i18n.translate('xpack.infra.apmSection.metricSummary.transPerMinuteLabel', {
                defaultMessage: 'Trans. per minute',
              })}
              value={`${numberFormatter(service.transactionsPerMinute)} tpm`}
            />
            <MetricSummaryItem
              label={i18n.translate('xpack.infra.apmSection.metricSummary.errorsPerMinuteLabel', {
                defaultMessage: 'Errors per minute',
              })}
              value={`${numberFormatter(service.errorsPerMinute)} tpm`}
            />
          </MetricSummary>
          {['request', 'job'].map(type => {
            if (service.dataSets.some(d => d.type === type)) {
              const transPerMinute = service.dataSets.find(
                d => d.type === type && d.id === 'transactionsPerMinute'
              );
              const responseTimes = service.dataSets.find(
                d => d.type === type && d.id === 'responseTimes'
              );
              return (
                <React.Fragment key={type}>
                  <EuiTitle size="xs">
                    <h3>
                      {i18n.translate(
                        'xpack.infra.apmSection.metricSummary.transactionDurationLabel',
                        { defaultMessage: 'Transaction duration ({type})', values: { type } }
                      )}
                    </h3>
                  </EuiTitle>
                  <div style={{ height: 200 }}>
                    <ApmChart
                      section={section}
                      dataSet={responseTimes}
                      formatterTemplate="{{value}} ms"
                      transformDataPoint={(value: number) => value / 1000}
                      isLiveStreaming={isLiveStreaming}
                      stopLiveStreaming={stopLiveStreaming}
                      onChangeRangeTime={onChangeRangeTime}
                    />
                  </div>
                  <EuiTitle size="xs">
                    <h3>
                      {i18n.translate(
                        'xpack.infra.apmSection.metricSummary.requestPerMinuteLabel',
                        { defaultMessage: 'Request per minute ({type})', values: { type } }
                      )}
                    </h3>
                  </EuiTitle>
                  <div style={{ height: 200 }}>
                    <ApmChart
                      section={section}
                      dataSet={transPerMinute}
                      formatterTemplate="{{value}} rpm"
                      isLiveStreaming={isLiveStreaming}
                      stopLiveStreaming={stopLiveStreaming}
                      onChangeRangeTime={onChangeRangeTime}
                    />
                  </div>
                </React.Fragment>
              );
            }
            return null;
          })}
        </React.Fragment>
      ))}
    </EuiPageContentBody>
  );
};
