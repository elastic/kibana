/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React from 'react';
import { EuiTitle } from '@elastic/eui';

interface PageTitleProps {
  title: ReactNode;
}

export const PageTitle: FC<PageTitleProps> = ({ title }) => (
  <EuiTitle size="l">
    <h1>{title}</h1>
  </EuiTitle>
);
