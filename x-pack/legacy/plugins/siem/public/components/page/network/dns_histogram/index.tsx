/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ScaleType } from '@elastic/charts';
import * as i18n from './translation';
import { MatrixHistogram } from '../../../matrix_histogram';
import { bytesFormatter } from '../../../matrix_histogram/utils';
import { MatrixOverOrdinalHistogramData } from '../../../../graphql/types';
import { MatrixHistogramBasicProps } from '../../../matrix_histogram/types';

export const NetworkDnsHistogram = (
  props: MatrixHistogramBasicProps<MatrixOverOrdinalHistogramData>
) => {
  const dataKey = 'histogram';
  const { ...matrixOverTimeProps } = props;

  return (
    <MatrixHistogram
      title={i18n.NETWORK_DNS_HISTOGRAM}
      dataKey={dataKey}
      scaleType={ScaleType.Ordinal}
      yTickFormatter={bytesFormatter}
      showLegend={false}
      {...matrixOverTimeProps}
    />
  );
};
