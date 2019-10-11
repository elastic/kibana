/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React, { useCallback } from 'react';
import { MetricsExplorerAggregation } from '../../../server/routes/metrics_explorer/types';
import { MetricsExplorerOptions } from '../../containers/metrics_explorer/use_metrics_explorer_options';

interface Props {
  options: MetricsExplorerOptions;
  fullWidth: boolean;
  onChange: (aggregation: MetricsExplorerAggregation) => void;
}

const isMetricsExplorerAggregation = (subject: any): subject is MetricsExplorerAggregation => {
  return Object.keys(MetricsExplorerAggregation).includes(subject);
};

export const MetricsExplorerAggregationPicker = ({ options, onChange }: Props) => {
  const AGGREGATION_LABELS = {
    [MetricsExplorerAggregation.avg]: i18n.translate(
      'xpack.infra.metricsExplorer.aggregationLables.avg',
      { defaultMessage: 'Average' }
    ),
    [MetricsExplorerAggregation.max]: i18n.translate(
      'xpack.infra.metricsExplorer.aggregationLables.max',
      { defaultMessage: 'Max' }
    ),
    [MetricsExplorerAggregation.min]: i18n.translate(
      'xpack.infra.metricsExplorer.aggregationLables.min',
      { defaultMessage: 'Min' }
    ),
    [MetricsExplorerAggregation.cardinality]: i18n.translate(
      'xpack.infra.metricsExplorer.aggregationLables.cardinality',
      { defaultMessage: 'Cardinality' }
    ),
    [MetricsExplorerAggregation.rate]: i18n.translate(
      'xpack.infra.metricsExplorer.aggregationLables.rate',
      { defaultMessage: 'Rate' }
    ),
    [MetricsExplorerAggregation.count]: i18n.translate(
      'xpack.infra.metricsExplorer.aggregationLables.count',
      { defaultMessage: 'Document count' }
    ),
  };

  const handleChange = useCallback(
    e => {
      const aggregation =
        (isMetricsExplorerAggregation(e.target.value) && e.target.value) ||
        MetricsExplorerAggregation.avg;
      onChange(aggregation);
    },
    [onChange]
  );

  return (
    <EuiSelect
      placeholder={i18n.translate('xpack.infra.metricsExplorer.aggregationSelectLabel', {
        defaultMessage: 'Select an aggregation',
      })}
      fullWidth
      value={options.aggregation}
      options={Object.keys(MetricsExplorerAggregation).map(k => ({
        text: AGGREGATION_LABELS[k as MetricsExplorerAggregation],
        value: k,
      }))}
      onChange={handleChange}
    />
  );
};
