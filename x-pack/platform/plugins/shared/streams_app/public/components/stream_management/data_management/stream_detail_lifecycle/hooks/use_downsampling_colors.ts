/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { colorPalette, useEuiTheme } from '@elastic/eui';

export const useDownsamplingColors = () => {
  const { euiTheme } = useEuiTheme();
  const downsamplingPalette = colorPalette(
    [euiTheme.colors.backgroundLightAssistance, euiTheme.colors.backgroundFilledAssistance],
    10
  );

  return {
    getDownsamplingColor: (index: number) => downsamplingPalette[index],
  };
};
