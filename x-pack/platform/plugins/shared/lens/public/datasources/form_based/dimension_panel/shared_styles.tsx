/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeCssVariables } from '@elastic/eui';
import { css } from '@emotion/react';

export const operationsButtonStyles = css`
    > button {
      padding-top: 0;
      padding-bottom: 0;
      min-block-size: ${euiThemeCssVariables.size.l};
    }
  `;
