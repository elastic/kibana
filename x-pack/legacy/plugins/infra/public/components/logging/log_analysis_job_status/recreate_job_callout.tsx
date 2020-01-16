/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';

import { RecreateJobButton } from './recreate_job_button';

export const RecreateJobCallout: React.FC<{
  onRecreateMlJob: () => void;
  title?: React.ReactNode;
}> = ({ children, onRecreateMlJob, title }) => (
  <EuiCallOut color="warning" iconType="alert" title={title}>
    <p>{children}</p>
    <RecreateJobButton color="warning" onClick={onRecreateMlJob} />
  </EuiCallOut>
);
