/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const useSteppedFlyoutStyles = () => {
  const { euiTheme } = useEuiTheme();
  const stepTitleFontSize = useEuiFontSize('s');

  const backHeaderCss = css`
    && {
      padding-block: ${euiTheme.size.xs};
      padding-left: ${euiTheme.size.s};
    }
  `;

  const stepsCss = css`
    .euiStep__content {
      padding-block-start: ${euiTheme.size.s};
      padding-block-end: ${euiTheme.size.base};
    }
    .euiStep__title {
      ${stepTitleFontSize}
    }
  `;

  return { backHeaderCss, stepsCss };
};
