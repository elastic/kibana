/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type FC } from 'react';

import type { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { CoreSetup, IUiSettingsClient, ThemeServiceStart } from '@kbn/core/public';
import type { HttpStart } from '@kbn/core/public';
import type { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';

/**
 * Date Picker Dependencies to be passed on via `DatePickerContextProvider`.
 */
export interface DatePickerDependencies {
  data: DataPublicPluginStart;
  http: HttpStart;
  notifications: CoreSetup['notifications'];
  theme: ThemeServiceStart;
  uiSettings: IUiSettingsClient;
  uiSettingsKeys: typeof UI_SETTINGS;
  wrapWithTheme: typeof wrapWithTheme;
  toMountPoint: typeof toMountPoint;
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
 * @param props - `DatePickerDependencies`
 * @returns JSX
 */
export const DatePickerContextProvider: FC<{ deps: DatePickerDependencies }> = ({
  children,
  deps,
}) => <DatePickerContext.Provider value={deps}>{children}</DatePickerContext.Provider>;
