/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageBody, EuiSpacer } from '@elastic/eui';

import type { HeaderProps } from '../components';
import { Header } from '../components';

import { Page, ContentWrapper, Wrapper } from './without_header';

export interface WithHeaderLayoutProps extends HeaderProps {
  restrictWidth?: number | boolean;
  restrictHeaderWidth?: number;
  'data-test-subj'?: string;
  children?: React.ReactNode;
  isReadOnly?: boolean;
  noSpacerInContent?: boolean;
}

export const WithHeaderLayout: React.FC<WithHeaderLayoutProps> = ({
  restrictWidth,
  restrictHeaderWidth,
  children,
  'data-test-subj': dataTestSubj,
  isReadOnly,
  noSpacerInContent,
  ...rest
}) => {
  // Default restrictWidth to false and header to full width.
  const pageRestrictWidth = restrictWidth !== undefined ? restrictWidth : false;
  const headerMaxWidth = restrictHeaderWidth !== undefined ? restrictHeaderWidth : '100%';

  return (
    <Wrapper>
      <Header
        maxWidth={headerMaxWidth}
        data-test-subj={dataTestSubj ? `${dataTestSubj}_header` : undefined}
        {...rest}
      />
      <Page
        restrictWidth={pageRestrictWidth}
        data-test-subj={dataTestSubj ? `${dataTestSubj}_page` : undefined}
      >
        <EuiPageBody>
          <ContentWrapper>
            {noSpacerInContent ? null : <EuiSpacer size="m" />}
            {children}
          </ContentWrapper>
        </EuiPageBody>
      </Page>
    </Wrapper>
  );
};
