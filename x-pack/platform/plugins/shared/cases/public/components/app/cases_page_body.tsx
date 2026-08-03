/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageSection } from '@elastic/eui';
import type { EuiPageSectionProps } from '@elastic/eui';
import { useCasesPageLayout } from './cases_page_layout';

type CasesPageBodyProps = EuiPageSectionProps;

export const CasesPageBody = ({ children, ...props }: CasesPageBodyProps) => {
  const { variant } = useCasesPageLayout();

  if (variant === 'legacy' || variant === 'fullHeight') {
    return <>{children}</>;
  }

  return (
    <EuiPageSection
      grow
      paddingSize="m"
      restrictWidth={false}
      data-test-subj="casesPageBody"
      {...props}
    >
      {children}
    </EuiPageSection>
  );
};

CasesPageBody.displayName = 'CasesPageBody';
