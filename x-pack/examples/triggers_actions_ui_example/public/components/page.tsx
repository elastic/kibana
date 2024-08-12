/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';

import { EuiPageTemplate, EuiTitle, EuiBreadcrumbs } from '@elastic/eui';

interface PageProps {
  title: string;
  crumb?: string;
  isHome?: boolean;
  children: React.ReactNode;
}

export const Page: React.FC<PageProps> = (props) => {
  const { title, crumb, isHome, children } = props;

  const history = useHistory();

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
    <EuiPageTemplate grow={false} offset={0}>
      <EuiPageTemplate.Header>
        <EuiTitle size="l">
          <h1>{title}</h1>
        </EuiTitle>
        <EuiBreadcrumbs responsive={false} breadcrumbs={breadcrumbs} />
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section paddingSize="none">{children}</EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
