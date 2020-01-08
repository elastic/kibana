/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import styled from 'styled-components';

const Container = styled.div`
  position: relative;
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: center;
  width: 100%;
  padding: ${theme.gutterTypes.gutterMedium};
`;

interface Props {
  children: React.ReactNode;
  isLoading: boolean;
}

export const LoadingOverlay = ({ children, isLoading }: Props) => (
  <Container>
    {isLoading && (
      <Overlay>
        <EuiLoadingChart size="xl" mono />
      </Overlay>
    )}
    {children}
  </Container>
);
