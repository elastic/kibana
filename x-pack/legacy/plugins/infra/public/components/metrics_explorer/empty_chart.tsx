/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt } from '@elastic/eui';

export const MetricsExplorerEmptyChart = injectI18n(() => {
  return (
    <EuiEmptyPrompt
      iconType="stats"
      title={
        <h3>
          <FormattedMessage
            id="xpack.infra.metricsExplorer.emptyChart.title"
            defaultMessage="Chart Data Missing"
          />
        </h3>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.infra.metricsExplorer.emptyChart.body"
            defaultMessage="Unable to render chart."
          />
        </p>
      }
    />
  );
});
