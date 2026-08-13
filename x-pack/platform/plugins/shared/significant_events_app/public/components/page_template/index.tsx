/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiPageSectionProps } from '@elastic/eui';
import { EuiPageTemplate } from '@elastic/eui';
import { css, cx } from '@emotion/css';
import type { AppHeaderProps } from '@kbn/app-header';
import { AppHeader } from '@kbn/app-header';

const templateClassName = css`
  height: 0;
`;

const noPaddingClassName = css`
  padding: 0;
`;

const bodyClassName = css`
  overflow-y: auto;
`;

const bodyContentClassName = css`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const SignificantEventsAppHeader = (props: AppHeaderProps) => <AppHeader {...props} />;

export function SignificantEventsAppPageTemplate({ children }: { children: React.ReactNode }) {
  return (
    <EuiPageTemplate offset={0} minHeight={0} restrictWidth={false} className={templateClassName}>
      {children}
    </EuiPageTemplate>
  );
}

SignificantEventsAppPageTemplate.Header = EuiPageTemplate.Header;
SignificantEventsAppPageTemplate.EmptyPrompt = EuiPageTemplate.EmptyPrompt;
SignificantEventsAppPageTemplate.Body = ({
  noPadding,
  ...props
}: EuiPageSectionProps & { noPadding?: boolean }) => (
  <EuiPageTemplate.Section
    grow
    className={noPadding ? cx(bodyClassName, noPaddingClassName) : bodyClassName}
    contentProps={{
      className: noPadding ? cx(bodyContentClassName, noPaddingClassName) : bodyContentClassName,
    }}
    {...props}
  />
);
