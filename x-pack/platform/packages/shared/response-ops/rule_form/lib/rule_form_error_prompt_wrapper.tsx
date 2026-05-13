/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate } from '@elastic/eui';

interface RuleFormErrorPromptWrapperProps {
  hasBorder?: boolean;
  hasShadow?: boolean;
}

export const RuleFormErrorPromptWrapper: React.FC<
  React.PropsWithChildren<RuleFormErrorPromptWrapperProps>
> = ({ children, hasBorder, hasShadow }) => {
  const styles = {
    backgroundColor: 'transparent',
  };

  return (
    <EuiPageTemplate offset={0} css={styles}>
      <EuiPageTemplate.EmptyPrompt paddingSize="none" hasBorder={hasBorder} hasShadow={hasShadow}>
        {children}
      </EuiPageTemplate.EmptyPrompt>
    </EuiPageTemplate>
  );
};
