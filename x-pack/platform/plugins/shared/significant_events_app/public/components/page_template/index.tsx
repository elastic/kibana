/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiPageSectionProps } from '@elastic/eui';
import { EuiPageTemplate } from '@elastic/eui';
import { css } from '@emotion/css';

const templateClassName = css`
  height: 0;
`;

const bodyClassName = css`
  overflow-y: auto;
`;

const bodyNoPaddingClassName = css`
  overflow-y: auto;
  padding: 0px;
`;

const bodyContentClassName = css`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const bodyContentNoPaddingClassName = css`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0px;
`;

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
    className={noPadding ? bodyNoPaddingClassName : bodyClassName}
    contentProps={{
      className: noPadding ? bodyContentNoPaddingClassName : bodyContentClassName,
    }}
    {...props}
  />
);
