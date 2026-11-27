/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiPageSection } from '@elastic/eui';

/** The page below its header, at the standard page width. */
export const PageContent = ({ children }: { children: ReactNode }) => (
  <EuiPageSection paddingSize="none" color="transparent" restrictWidth>
    {children}
  </EuiPageSection>
);
