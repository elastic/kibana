/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { EuiComboBox } from '@elastic/eui';

const AGG_OPTIONS = [
  {
    label: i18n.translate('xpack.maps.metricSelect.averageDropDownOptionLabel', {
      defaultMessage: 'Average',
    }),
    value: 'avg',
  },
  {
    label: i18n.translate('xpack.maps.metricSelect.countDropDownOptionLabel', {
      defaultMessage: 'Count',
    }),
    value: 'count',
  },
  {
    label: i18n.translate('xpack.maps.metricSelect.maxDropDownOptionLabel', {
      defaultMessage: 'Max',
    }),
    value: 'max',
  },
  {
    label: i18n.translate('xpack.maps.metricSelect.minDropDownOptionLabel', {
      defaultMessage: 'Min',
    }),
    value: 'min',
  },
  {
    label: i18n.translate('xpack.maps.metricSelect.sumDropDownOptionLabel', {
      defaultMessage: 'Sum',
    }),
    value: 'sum',
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
