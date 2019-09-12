/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { getOr } from 'lodash/fp';

import { EventsOverTimeData } from '../../../../graphql/types';
import * as i18n from './translation';

import { UpdateDateRange } from '../../../charts/common';
import { MatrixOverTimeHistogram } from '../../../matrix_over_time';

export const EventsOverTimeHistogram = (props: {
  id: string;
  data: EventsOverTimeData;
  loading: boolean;
  startDate: number;
  endDate: number;
  narrowDateRange: UpdateDateRange;
}) => {
  const dataKey = 'eventsOverTime';
  const matrixOverTimeData = getOr([], `data.${dataKey}`, props);
  const totalCount = getOr(0, 'data.totalCount', props);
  const subtitle = `${i18n.SHOWING}: ${totalCount.toLocaleString()} ${i18n.UNIT(totalCount)}`;
  const { data, ...matrixOverTimeProps } = props;

  return (
    <MatrixOverTimeHistogram
      title={i18n.EVENT_COUNT_FREQUENCY}
      subtitle={subtitle}
      dataKey={dataKey}
      data={matrixOverTimeData}
      {...matrixOverTimeProps}
    />
  );
};
