/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt } from '@elastic/eui';

export const NoChangePointsWarning = (props: { onRenderComplete?: () => void }) => {
  props.onRenderComplete?.();

  return (
    <EuiEmptyPrompt
      iconType="search"
      title={
        <h2>
          <FormattedMessage
            id="xpack.aiops.changePointDetection.noChangePointsFoundTitle"
            defaultMessage="No change points found"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.aiops.changePointDetection.noChangePointsFoundMessage"
            defaultMessage="Detect statistically significant change points such as dips, spikes, and distribution changes in a metric. Select a metric and set a time range to start detecting change points in your data."
          />
        </p>
      }
    />
  );
};
