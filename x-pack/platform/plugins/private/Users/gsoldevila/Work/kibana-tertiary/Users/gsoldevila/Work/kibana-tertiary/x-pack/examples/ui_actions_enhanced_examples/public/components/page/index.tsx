/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiPageBody, EuiPageTemplate, EuiPageSection, EuiPageHeader } from '@elastic/eui';

export interface PageProps {
  children: React.ReactNode;
  title?: React.ReactNode;
}

export const Page: React.FC<PageProps> = ({ title = 'Untitled', children }) => {
  return (
    <EuiPageBody style={{ maxWidth: 1200, margin: '0 auto' }}>
      <EuiPageSection>
        <EuiPageHeader pageTitle={title} />
      </EuiPageSection>
      <EuiPageTemplate.Section>
        <EuiPageSection style={{ maxWidth: 800, margin: '0 auto' }}>{children}</EuiPageSection>
      </EuiPageTemplate.Section>
    </EuiPageBody>
  );
};
