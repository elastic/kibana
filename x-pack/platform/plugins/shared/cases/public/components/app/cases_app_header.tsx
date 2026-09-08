/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderProps } from '@kbn/app-header';
import { useCasesPageLayout } from './cases_page_layout';

export const CasesAppHeader = (props: AppHeaderProps) => {
  const { variant } = useCasesPageLayout();
  const spacing = props.spacing ?? (variant === 'legacy' ? 'flush' : 'standard');

  return <AppHeader {...props} spacing={spacing} />;
};

CasesAppHeader.displayName = 'CasesAppHeader';
