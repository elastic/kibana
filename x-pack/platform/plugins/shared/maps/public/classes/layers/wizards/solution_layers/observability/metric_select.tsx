/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent } from 'react';
import { EuiFormRow, EuiSelect, EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_LAYER_TYPE } from './layer_select';

export enum OBSERVABILITY_METRIC_TYPE {
  TRANSACTION_DURATION = 'TRANSACTION_DURATION',
  COUNT = 'COUNT',
  UNIQUE_COUNT = 'UNIQUE_COUNT',
}

const APM_RUM_PERFORMANCE_METRIC_OPTIONS = [
  {
    value: OBSERVABILITY_METRIC_TYPE.TRANSACTION_DURATION,
    text: i18n.translate('xpack.maps.observability.transactionDurationLabel', {
      defaultMessage: 'Transaction duraction',
    }),
  },
];

const APM_RUM_TRAFFIC_METRIC_OPTIONS = [
  {
    value: OBSERVABILITY_METRIC_TYPE.COUNT,
    text: i18n.translate('xpack.maps.observability.countLabel', {
      defaultMessage: 'Count',
    }),
  },
  {
    value: OBSERVABILITY_METRIC_TYPE.UNIQUE_COUNT,
    text: i18n.translate('xpack.maps.observability.uniqueCountLabel', {
      defaultMessage: 'Unique count',
    }),
  },
];

export function getMetricOptionsForLayer(layer: OBSERVABILITY_LAYER_TYPE): EuiSelectOption[] {
  if (layer === OBSERVABILITY_LAYER_TYPE.APM_RUM_PERFORMANCE) {
    return APM_RUM_PERFORMANCE_METRIC_OPTIONS;
  }

  if (layer === OBSERVABILITY_LAYER_TYPE.APM_RUM_TRAFFIC) {
    return APM_RUM_TRAFFIC_METRIC_OPTIONS;
  }

  return [];
}

interface Props {
  layer: OBSERVABILITY_LAYER_TYPE | null;
  value: OBSERVABILITY_METRIC_TYPE | null;
  onChange: (metricType: OBSERVABILITY_METRIC_TYPE) => void;
}

export function MetricSelect(props: Props) {
  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    props.onChange(event.target.value as OBSERVABILITY_METRIC_TYPE);
  }

  if (!props.layer || !props.value) {
    return null;
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.maps.observability.metricLabel', {
        defaultMessage: 'Metric',
      })}
    >
      <EuiSelect
        options={getMetricOptionsForLayer(props.layer)}
        value={props.value}
        onChange={onChange}
      />
    </EuiFormRow>
  );
}
