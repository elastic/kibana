/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import {
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiBreadcrumbs,
  EuiSpacer,
} from '@elastic/eui';

type PageProps = RouteComponentProps & {
  title: string;
  children: React.ReactNode;
  crumb?: string;
  isHome?: boolean;
};

export const Page = withRouter(({ title, crumb, children, isHome = false, history }: PageProps) => {
  const breadcrumbs: Array<{
    text: string;
    onClick?: () => void;
  }> = [
    {
      text: crumb ?? title,
    },
  ];
  if (!isHome) {
    breadcrumbs.splice(0, 0, {
      text: 'Home',
      onClick: () => {
        history.push(`/`);
      },
    });
  }
  return (
    <EuiPageBody data-test-subj="searchTestPage">
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>{title}</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiBreadcrumbs responsive={false} breadcrumbs={breadcrumbs} />
      <EuiSpacer />
      <EuiPageContent>
        <EuiPageContentBody>{children}</EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
});
