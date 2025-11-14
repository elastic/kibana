/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { EMPTY_STATE_TITLE, EMPTY_STATE_DESCRIPTION } from './translations';

export const EmptyState: React.FC = () => {
  return (
    <EuiEmptyPrompt
      iconType="logoElastic"
      title={<h2>{EMPTY_STATE_TITLE}</h2>}
      body={<p>{EMPTY_STATE_DESCRIPTION}</p>}
    />
  );
};
