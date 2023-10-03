/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type FC } from 'react';

import type { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { CoreSetup, I18nStart, IUiSettingsClient, ThemeServiceStart } from '@kbn/core/public';
import type { HttpStart } from '@kbn/core/public';

/**
 * Date Picker Dependencies to be passed on via `DatePickerContextProvider`.
 */
export interface DatePickerDependencies {
  /**
   * data plugin
   */
  data: DataPublicPluginStart;
  /**
   * http service
   */
  http: HttpStart;
  /**
   * notifications service
   */
  notifications: CoreSetup['notifications'];
  /**
   * EUI theme
   */
  theme: ThemeServiceStart;
  /**
   * Kibana UI advanced settings
   */
  uiSettings: IUiSettingsClient;
  /**
   * Kibana UI advanced settings keys.
   */
  uiSettingsKeys: typeof UI_SETTINGS;
  /**
   * Internationalisation service
   */
  i18n: I18nStart;
  /**
   * Optional flag to disable the frozen data tier choice.
   */
  showFrozenDataTierChoice?: boolean;
}

/**
 * The context holding the date picker dependencies.
 */
export const DatePickerContext = createContext<DatePickerDependencies | undefined>(undefined);

/**
 * Custom hook to return date picker dependencies.
 * @returns `DatePickerDependencies`
 */
export const useDatePickerContext = (): DatePickerDependencies => {
  const datePickerContext = useContext(DatePickerContext);

  // if `undefined`, throw an error
  if (datePickerContext === undefined) {
    throw new Error('datePickerContext was used outside of its Provider');
  }

  return datePickerContext;
};

/**
 * React Component that acts as a wrapper for DatePickerContext.
 *
 * @type {FC<DatePickerDependencies>}
 * @param props - The component props
 * @returns {React.ReactElement} The DatePickerContextProvider component.
 */

export const DatePickerContextProvider: FC<DatePickerDependencies> = (props) => {
  const { children, ...deps } = props;
  return <DatePickerContext.Provider value={deps}>{children}</DatePickerContext.Provider>;
};
