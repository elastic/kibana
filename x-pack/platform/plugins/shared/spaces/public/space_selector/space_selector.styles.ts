/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

export const panelStyles = css`
  text-align: center;
  margin-inline: auto;
  max-width: 700px;
`;

export const pageTemplateStyles = css`
  background-color: transparent;
`;

export const headerStyles = css`
  &:focus {
    outline: none;
    text-decoration: underline;
  }
`;
