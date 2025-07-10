/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const dataPanelStyles = ({ euiTheme }: UseEuiTheme) => {
  return css`
    padding: ${euiTheme.size.base} ${euiTheme.size.base} 0;
    .unifiedFieldListItemButton.kbnFieldButton {
      background: none;
      box-shadow: none;
      margin-bottom: calc(${euiTheme.size.xs} / 2);
    }
    .unifiedFieldListItemButton__dragging {
      background: ${euiTheme.colors.backgroundBasePlain};
    }
  `;
};
