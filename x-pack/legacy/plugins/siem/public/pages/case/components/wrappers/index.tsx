/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled, { css } from 'styled-components';

export const WhitePageWrapper = styled.div`
  ${({ theme }) => css`
    background-color: ${theme.eui.euiColorEmptyShade};
    border-top: ${theme.eui.euiBorderThin};
    height: 100%;
    min-height: 100vh;
  `}
`;

export const SectionWrapper = styled.div`
  box-sizing: content-box;
  margin: 0 auto;
  max-width: 1175px;
`;
