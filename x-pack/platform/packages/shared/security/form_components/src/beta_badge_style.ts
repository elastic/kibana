/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Theme } from '@emotion/react';
import { css } from '@emotion/react';

export const betaBadgeStyle = ({ euiTheme }: Theme) => css`
  padding: calc(${euiTheme.size.xxs} * 1.5);
  border: ${euiTheme.border.width.thin} solid ${euiTheme.border.color};
  border-radius: 50%;
`;
