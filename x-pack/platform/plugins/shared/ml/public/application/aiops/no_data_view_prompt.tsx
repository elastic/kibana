/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const NoDataViewPrompt: FC = () => (
  <EuiEmptyPrompt
    title={
      <h2>
        <FormattedMessage
          id="xpack.ml.common.noDataViewTitle"
          defaultMessage="No data view selected"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.ml.common.noDataViewBody"
          defaultMessage="Select a data view or Discover session to get started."
        />
      </p>
    }
  />
);
