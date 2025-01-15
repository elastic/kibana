/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import { AGG_TYPE } from '../../../common/constants';
import { getAggDisplayName } from '../../classes/sources/es_agg_source';

const AGG_OPTIONS = [
  {
    label: getAggDisplayName(AGG_TYPE.AVG),
    value: AGG_TYPE.AVG,
  },
  {
    label: getAggDisplayName(AGG_TYPE.COUNT),
    value: AGG_TYPE.COUNT,
  },
  {
    label: getAggDisplayName(AGG_TYPE.MAX),
    value: AGG_TYPE.MAX,
  },
  {
    label: getAggDisplayName(AGG_TYPE.MIN),
    value: AGG_TYPE.MIN,
  },
  {
    label: getAggDisplayName(AGG_TYPE.PERCENTILE),
    value: AGG_TYPE.PERCENTILE,
  },
  {
    label: getAggDisplayName(AGG_TYPE.SUM),
    value: AGG_TYPE.SUM,
  },
  {
    label: getAggDisplayName(AGG_TYPE.TERMS),
    value: AGG_TYPE.TERMS,
  },
  {
    label: getAggDisplayName(AGG_TYPE.UNIQUE_COUNT),
    value: AGG_TYPE.UNIQUE_COUNT,
  },
];

type Props = Omit<EuiComboBoxProps<AGG_TYPE>, 'onChange'> & {
  value: AGG_TYPE;
  onChange: (aggType: AGG_TYPE) => void;
  metricsFilter?: (metricOption: EuiComboBoxOptionOption<AGG_TYPE>) => boolean;
};

export function MetricSelect({ value, onChange, metricsFilter, ...rest }: Props) {
  function onAggChange(selectedOptions: Array<EuiComboBoxOptionOption<AGG_TYPE>>) {
    if (selectedOptions.length === 0) {
      return;
    }

    const aggType = selectedOptions[0].value!;
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
      selectedOptions={AGG_OPTIONS.filter((option) => {
        return value === option.value;
      })}
      onChange={onAggChange}
      {...rest}
    />
  );
}
