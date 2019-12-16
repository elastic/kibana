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
import {
  metricsExplorerAggregationRT,
  METRIC_EXPLORER_AGGREGATIONS,
} from '../../../common/http_api/metrics_explorer';

interface Props {
  options: MetricsExplorerOptions;
  fullWidth: boolean;
  onChange: (aggregation: MetricsExplorerAggregation) => void;
}

export const MetricsExplorerAggregationPicker = ({ options, onChange }: Props) => {
  const AGGREGATION_LABELS = {
    ['avg']: i18n.translate('xpack.infra.metricsExplorer.aggregationLables.avg', {
      defaultMessage: 'Average',
    }),
    ['max']: i18n.translate('xpack.infra.metricsExplorer.aggregationLables.max', {
      defaultMessage: 'Max',
    }),
    ['min']: i18n.translate('xpack.infra.metricsExplorer.aggregationLables.min', {
      defaultMessage: 'Min',
    }),
    ['cardinality']: i18n.translate('xpack.infra.metricsExplorer.aggregationLables.cardinality', {
      defaultMessage: 'Cardinality',
    }),
    ['rate']: i18n.translate('xpack.infra.metricsExplorer.aggregationLables.rate', {
      defaultMessage: 'Rate',
    }),
    ['count']: i18n.translate('xpack.infra.metricsExplorer.aggregationLables.count', {
      defaultMessage: 'Document count',
    }),
  };

  const handleChange = useCallback(
    e => {
      const aggregation =
        (metricsExplorerAggregationRT.is(e.target.value) && e.target.value) || 'avg';
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
      options={METRIC_EXPLORER_AGGREGATIONS.map(k => ({
        text: AGGREGATION_LABELS[k as MetricsExplorerAggregation],
        value: k,
      }))}
      onChange={handleChange}
    />
  );
};
