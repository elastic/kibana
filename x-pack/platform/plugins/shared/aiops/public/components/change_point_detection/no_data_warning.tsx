/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt } from '@elastic/eui';

export const NoDataFoundWarning = (props: { onRenderComplete?: () => void }) => {
  props.onRenderComplete?.();

  return (
    <EuiEmptyPrompt
      data-test-subj="aiopsNoDataFoundWarning"
      iconType="search"
      title={
        <h2>
          <FormattedMessage
            id="xpack.aiops.changePointDetection.noDataFoundTitle"
            defaultMessage="No data found"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.aiops.changePointDetection.noDataFoundMessage"
            defaultMessage="No data found for the selected metric and time range. Try adjusting your selection to include data from your indices."
          />
        </p>
      }
    />
  );
};
