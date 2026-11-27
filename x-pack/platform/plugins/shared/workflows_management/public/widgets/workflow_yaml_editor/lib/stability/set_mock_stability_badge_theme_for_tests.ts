/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { setStabilityBadgeThemeContext } from './stability_badge_theme';

const MOCK_STABILITY_BADGE_THEME: UseEuiTheme = {
  euiTheme: {
    colors: {
      backgroundBasePlain: '#111111',
      textParagraph: '#eeeeee',
    },
    components: {
      badgeBorderColorHollow: '#444444',
    },
  },
  colorMode: 'DARK',
  modifications: {},
  highContrastMode: false,
} as UseEuiTheme;

export function setMockStabilityBadgeThemeForTests(): void {
  setStabilityBadgeThemeContext(MOCK_STABILITY_BADGE_THEME);
}
