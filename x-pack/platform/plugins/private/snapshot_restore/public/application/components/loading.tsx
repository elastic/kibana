/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  EuiPageTemplate,
} from '@elastic/eui';

interface Props {
  inline?: boolean;
  children: React.ReactNode;
  [key: string]: any;
}

export const InlineLoading: React.FunctionComponent<Props> = ({ children, ...rest }) => {
  return (
    <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="m" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText {...rest}>
          <EuiTextColor color="subdued">{children}</EuiTextColor>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const SectionLoading: React.FunctionComponent<Props> = ({ children }) => {
  return (
    <EuiEmptyPrompt
      title={<EuiLoadingSpinner size="xl" />}
      body={<EuiText color="subdued">{children}</EuiText>}
      data-test-subj="sectionLoading"
    />
  );
};

/*
 * Loading component used for full page loads.
 * For tabbed sections, or within the context of a wizard,
 * the <SectionLoading/> component may be more appropriate
 */
export const PageLoading: React.FunctionComponent<Props> = ({ children }) => {
  return (
    <EuiPageTemplate.EmptyPrompt
      title={<EuiLoadingSpinner size="xl" />}
      body={<EuiText color="subdued">{children}</EuiText>}
      data-test-subj="sectionLoading"
    />
  );
};
