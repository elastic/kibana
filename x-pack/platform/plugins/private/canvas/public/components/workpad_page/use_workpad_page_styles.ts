/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiShadowFlat, useEuiTheme } from '@elastic/eui';

export const useWorkpadPageStyles = () => {
  const { euiTheme } = useEuiTheme();
  const flatShadow = useEuiShadowFlat();

  return useMemo(
    () => css`
      ${flatShadow}
      background-color: ${euiTheme.colors.emptyShade};
    `,
    [euiTheme, flatShadow]
  );
};
