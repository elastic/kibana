/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt, EuiTitle } from '@elastic/eui';
import React from 'react';

export const DurationChartEmptyState = () => (
  <EuiEmptyPrompt
    title={
      <EuiTitle>
        <h5>
          <FormattedMessage
            id="xpack.uptime.durationChart.emptyPrompt.title"
            defaultMessage="No duration data available"
          />
        </h5>
      </EuiTitle>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.uptime.durationChart.emptyPrompt.description"
          defaultMessage="This monitor has never been {emphasizedText} during the selected time range."
          values={{ emphasizedText: <strong>up</strong> }}
        />
      </p>
    }
  />
);
