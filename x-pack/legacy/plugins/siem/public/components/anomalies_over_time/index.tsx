/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { MatrixHistogramBasicProps } from '../matrix_histogram/types';
import { MatrixOverTimeHistogramData } from '../../graphql/types';
import { MatrixHistogram } from '../matrix_histogram';
import * as i18n from './translation';

export const AnomaliesOverTimeHistogram = (
  props: MatrixHistogramBasicProps<MatrixOverTimeHistogramData>
) => {
  const dataKey = 'anomaliesOverTime';
  const { totalCount } = props;
  const subtitle = `${i18n.SHOWING}: ${totalCount.toLocaleString()} ${i18n.UNIT(totalCount)}`;
  const { ...matrixOverTimeProps } = props;

  return (
    <MatrixHistogram
      title={i18n.ANOMALIES_COUNT_FREQUENCY_BY_ACTION}
      subtitle={subtitle}
      dataKey={dataKey}
      {...matrixOverTimeProps}
    />
  );
};
