/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { colorPalette, useEuiTheme } from '@elastic/eui';
import type { BoostPeriodId } from './boost_periods';

/** Shades of the assistance color, from the most boosted period to the least. */
export const useBoostPeriodColors = (): Readonly<Record<BoostPeriodId, string>> => {
  const { euiTheme } = useEuiTheme();
  const [, background, standard, recent] = colorPalette(
    [euiTheme.colors.backgroundLightAssistance, euiTheme.colors.backgroundFilledAssistance],
    4
  );

  return { recent, standard, background };
};
