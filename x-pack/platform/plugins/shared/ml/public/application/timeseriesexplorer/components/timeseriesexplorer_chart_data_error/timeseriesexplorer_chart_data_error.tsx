/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';

export const TimeseriesexplorerChartDataError = ({ errorMsg }: { errorMsg: string }) => {
  return (
    <EuiEmptyPrompt
      // POC: lifts the prompt off the recessed glass surface; shadow requires no border.
      color="plain"
      hasShadow
      hasBorder={false}
      iconType="warning"
      title={<h2>{errorMsg}</h2>}
    />
  );
};
