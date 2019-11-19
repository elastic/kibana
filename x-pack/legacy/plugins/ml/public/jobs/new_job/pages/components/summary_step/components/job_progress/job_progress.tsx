/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiProgress } from '@elastic/eui';

interface Props {
  progress: number;
}

export const JobProgress: FC<Props> = ({ progress }) => {
  if (progress > 0 && progress < 100) {
    return <EuiProgress value={progress} color="primary" size="xs" max={100} />;
  } else {
    return null;
  }
};
