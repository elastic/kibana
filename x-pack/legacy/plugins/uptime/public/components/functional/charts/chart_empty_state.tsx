/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt, EuiTitle } from '@elastic/eui';
import React, { FC } from 'react';

interface ChartEmptyStateProps {
  title: string | JSX.Element;
  body: string | JSX.Element;
}

export const ChartEmptyState: FC<ChartEmptyStateProps> = ({ title, body }) => (
  <EuiEmptyPrompt
    title={
      <EuiTitle>
        <h5>{title}</h5>
      </EuiTitle>
    }
    body={<p>{body}</p>}
  />
);
