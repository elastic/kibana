/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { css } from '@emotion/react';
import { UseEuiTheme, useEuiTheme } from '@elastic/eui';

const mapColorStopsStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    position: 'relative',
    '& + &': {
      marginTop: euiTheme.size.s,
    },
  });

export const useMapColorStopsStyles = () => {
  const euiThemeContext = useEuiTheme();
  return useMemo(() => css(mapColorStopsStyles(euiThemeContext)), [euiThemeContext]);
};
