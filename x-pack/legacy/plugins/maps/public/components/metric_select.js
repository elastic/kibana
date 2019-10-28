/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { EuiComboBox } from '@elastic/eui';
import { METRIC_TYPE } from '../../common/constants';

const AGG_OPTIONS = [
  {
    label: i18n.translate('xpack.maps.metricSelect.averageDropDownOptionLabel', {
      defaultMessage: 'Average',
    }),
    value: METRIC_TYPE.AVG,
  },
  {
    label: i18n.translate('xpack.maps.metricSelect.countDropDownOptionLabel', {
      defaultMessage: 'Count',
    }),
    value: METRIC_TYPE.COUNT,
  },
  {
    label: i18n.translate('xpack.maps.metricSelect.maxDropDownOptionLabel', {
      defaultMessage: 'Max',
    }),
    value: METRIC_TYPE.MAX,
  },
  {
    label: i18n.translate('xpack.maps.metricSelect.minDropDownOptionLabel', {
      defaultMessage: 'Min',
    }),
    value: METRIC_TYPE.MIN,
  },
  {
    label: i18n.translate('xpack.maps.metricSelect.sumDropDownOptionLabel', {
      defaultMessage: 'Sum',
    }),
    value: METRIC_TYPE.SUM,
  },
  {
    label: i18n.translate('xpack.maps.metricSelect.cardinalityDropDownOptionLabel', {
      defaultMessage: 'Unique count',
    }),
    value: METRIC_TYPE.UNIQUE_COUNT,
  },
];

export const METRIC_AGGREGATION_VALUES = AGG_OPTIONS.map(({ value }) => {
  return value;
});

export function MetricSelect({ value, onChange, metricsFilter, ...rest }) {
  function onAggChange(selectedOptions) {
    if (selectedOptions.length === 0) {
      return;
    }

    const aggType = selectedOptions[0].value;
    onChange(aggType);
  }

  const options = metricsFilter ? AGG_OPTIONS.filter(metricsFilter) : AGG_OPTIONS;

  return (
    <EuiComboBox
      placeholder={i18n.translate('xpack.maps.metricSelect.selectAggregationPlaceholder', {
        defaultMessage: 'Select aggregation',
      })}
      singleSelection={true}
      isClearable={false}
      options={options}
      selectedOptions={AGG_OPTIONS.filter(option => {
        return value === option.value;
      })}
      onChange={onAggChange}
      {...rest}
    />
  );
}

MetricSelect.propTypes = {
  metricsFilter: PropTypes.func,
  value: PropTypes.oneOf(METRIC_AGGREGATION_VALUES),
  onChange: PropTypes.func.isRequired,
};
