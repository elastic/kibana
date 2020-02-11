/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import React, { createContext, useMemo } from 'react';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { UptimeAppColors } from '../uptime_app';

export interface UptimeThemeContextValues {
  colors: UptimeAppColors;
}

/**
 * These are default values for the context. These defaults are typically
 * overwritten by the Uptime App upon its invocation.
 */
const defaultContext: UptimeThemeContextValues = {
  colors: {
    danger: euiLightVars.euiColorDanger,
    mean: euiLightVars.euiColorPrimary,
    range: euiLightVars.euiFocusBackgroundColor,
    success: euiLightVars.euiColorSuccess,
    warning: euiLightVars.euiColorWarning,
    gray: euiLightVars.euiColorLightShade,
  },
};

export const UptimeThemeContext = createContext(defaultContext);

interface ThemeContextProps {
  darkMode: boolean;
}

export const UptimeThemeContextProvider: React.FC<ThemeContextProps> = ({ darkMode, children }) => {
  let colors: UptimeAppColors;
  if (darkMode) {
    colors = {
      danger: euiDarkVars.euiColorDanger,
      mean: euiDarkVars.euiColorPrimary,
      gray: euiDarkVars.euiColorLightShade,
      range: euiDarkVars.euiFocusBackgroundColor,
      success: euiDarkVars.euiColorSuccess,
      warning: euiDarkVars.euiColorWarning,
    };
  } else {
    colors = {
      danger: euiLightVars.euiColorDanger,
      mean: euiLightVars.euiColorPrimary,
      gray: euiLightVars.euiColorLightShade,
      range: euiLightVars.euiFocusBackgroundColor,
      success: euiLightVars.euiColorSuccess,
      warning: euiLightVars.euiColorWarning,
    };
  }
  const value = useMemo(() => {
    return {
      colors,
    };
  }, [colors]);

  return <UptimeThemeContext.Provider value={value} children={children} />;
};
