/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import * as i18n from './translation';
import { MatrixHistogram } from '../../../matrix_histogram';
import { MatrixHistogramBasicProps } from '../../../matrix_histogram/types';
import { MatrixOverTimeHistogramData } from '../../../../graphql/types';

export const AlertsOverTimeHistogram = (
  props: MatrixHistogramBasicProps<MatrixOverTimeHistogramData>
) => {
  const dataKey = 'alertsOverTime';
  const { totalCount } = props;
  const subtitle = `${i18n.SHOWING}: ${totalCount.toLocaleString()} ${i18n.UNIT(totalCount)}`;
  const { ...matrixOverTimeProps } = props;

  return (
    <MatrixHistogram
      dataKey={dataKey}
      subtitle={subtitle}
      title={i18n.ALERTS_COUNT_FREQUENCY_BY_MODULE}
      {...matrixOverTimeProps}
    />
  );
};
