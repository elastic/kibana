/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import { css } from '@emotion/css';

export const ToolbarDivider = () => (
  <EuiHorizontalRule
    margin="s"
    className={css`
      margin-inline: -8px;
      inline-size: calc(100% + 16px);
    `}
  />
);
