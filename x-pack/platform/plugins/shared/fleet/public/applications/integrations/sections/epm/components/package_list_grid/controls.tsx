/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import styled from 'styled-components';

import { EuiFlexGroup, EuiSpacer, EuiTitle } from '@elastic/eui';

interface ControlsColumnProps {
  controls: ReactNode;
  title: string | undefined;
}

const FlexGroupWithMaxHeight = styled(EuiFlexGroup)`
  max-height: calc(100vh - 120px);
`;

export const ControlsColumn = ({ controls, title }: ControlsColumnProps) => {
  let titleContent;
  if (title) {
    titleContent = (
      <>
        <EuiTitle size="s">
          <h2>{title}</h2>
        </EuiTitle>
        <EuiSpacer size="l" />
      </>
    );
  }
  return (
    <FlexGroupWithMaxHeight direction="column" gutterSize="none">
      {titleContent}
      {controls}
    </FlexGroupWithMaxHeight>
  );
};
