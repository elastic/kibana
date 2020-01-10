/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { EuiProgress, EuiText, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';

const Container = styled.div`
  position: relative;
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: ${theme.gutterTypes.gutterMedium};
`;

const ProgressBarContainer = styled.div`
  width: 50%;
  max-width: 600px;
`;

interface Props {
  children: React.ReactNode;
  isLoading: boolean;
  percentageLoaded: number;
}

export const LoadingOverlay = ({
  children,
  isLoading,
  percentageLoaded
}: Props) => (
  <Container>
    {isLoading && (
      <Overlay>
        <ProgressBarContainer>
          <EuiProgress
            value={percentageLoaded}
            max={100}
            color="primary"
            size="m"
          />
        </ProgressBarContainer>
        <EuiSpacer size="s" />
        <EuiText size="s" textAlign="center">
          {i18n.translate('xpack.apm.loadingServiceMap', {
            defaultMessage:
              'Loading service map... This might take a short while.'
          })}
        </EuiText>
      </Overlay>
    )}
    {children}
  </Container>
);
