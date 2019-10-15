/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import * as i18n from './translation';
import { MatrixOverTimeHistogram, MatrixOverTimeBasicProps } from '../../../matrix_over_time';

export const AuthenticationsOverTimeHistogram = (props: MatrixOverTimeBasicProps) => {
  const dataKey = 'authenticationsOverTime';
  const { ...matrixOverTimeProps } = props;

  return (
    <MatrixOverTimeHistogram
      title={i18n.AUTHENTICATIONS_COUNT}
      dataKey={dataKey}
      {...matrixOverTimeProps}
    />
  );
};
