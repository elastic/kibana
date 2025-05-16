/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TIME_SERIES_LABEL, TERMS_LABEL } from './i18n_constants';

const GROUP_BY_TIME_SERIES = 'timeseries';
const GROUP_BY_TERM = 'terms';
const GROUP_BY_OPTIONS = [
  {
    id: GROUP_BY_TIME_SERIES,
    label: TIME_SERIES_LABEL,
  },
  {
    id: GROUP_BY_TERM,
    label: TERMS_LABEL,
  },
];

interface Props {
  groupByTimeseries: boolean;
  onGroupByTimeseriesChange: (groupByTimeseries: boolean) => void;
}

export function GroupByButtonGroup({ groupByTimeseries, onGroupByTimeseriesChange }: Props) {
  return (
    <EuiButtonGroup
      type="single"
      legend={i18n.translate('xpack.maps.source.esGeoLine.groupByButtonGroupLegend', {
        defaultMessage: 'Choose group by method',
      })}
      options={GROUP_BY_OPTIONS}
      idSelected={groupByTimeseries ? GROUP_BY_TIME_SERIES : GROUP_BY_TERM}
      onChange={(id: string) => {
        onGroupByTimeseriesChange(id === GROUP_BY_TIME_SERIES);
      }}
      isFullWidth={true}
      buttonSize="compressed"
    />
  );
}
