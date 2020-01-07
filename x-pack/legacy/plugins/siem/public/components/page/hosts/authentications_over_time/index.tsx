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
import { authMatrixDataMappingFields } from './utils';

export const AuthenticationsOverTimeHistogram = (
  props: MatrixHistogramBasicProps<MatrixOverTimeHistogramData>
) => {
  const dataKey = 'authenticationsOverTime';
  const { data, ...matrixOverTimeProps } = props;

  return (
    <MatrixHistogram
      data={data}
      dataKey={dataKey}
      mapping={authMatrixDataMappingFields}
      title={i18n.AUTHENTICATIONS_COUNT}
      {...matrixOverTimeProps}
    />
  );
};
