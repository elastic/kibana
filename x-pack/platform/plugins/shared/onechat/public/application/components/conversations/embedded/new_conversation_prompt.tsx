/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

const fullHeightStyles = css`
  height: 100%;
`;

export const EmbeddedNewConversationPrompt: React.FC<{
  welcomeText: React.ReactNode;
  inputForm: React.ReactNode;
  navigationCards?: React.ReactNode;
}> = ({ welcomeText, inputForm }) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="l" css={fullHeightStyles} justifyContent="center">
      <EuiFlexItem grow={false}>{welcomeText}</EuiFlexItem>
      <EuiFlexItem grow={false}>{inputForm}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
