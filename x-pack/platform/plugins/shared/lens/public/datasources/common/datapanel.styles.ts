/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeCssVariables } from '@elastic/eui';
import { css } from '@emotion/react';

export const dataPanelStyles =  css`
    padding: ${euiThemeCssVariables.size.base} ${euiThemeCssVariables.size.base} 0;
    .unifiedFieldListItemButton.kbnFieldButton {
      background: none;
      box-shadow: none;
      margin-bottom: calc(${euiThemeCssVariables.size.xs} / 2);
    }
    .unifiedFieldListItemButton__dragging {
      background: ${euiThemeCssVariables.colors.backgroundBasePlain};
    }
  `;
