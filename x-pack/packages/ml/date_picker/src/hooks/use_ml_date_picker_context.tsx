/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type FC } from 'react';

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { CoreSetup, IUiSettingsClient, ThemeServiceStart } from '@kbn/core/public';
import type { HttpStart } from '@kbn/core/public';

export interface MlDatePickerDependencies {
  data: DataPublicPluginStart;
  http: HttpStart;
  notifications: CoreSetup['notifications'];
  theme: ThemeServiceStart;
  uiSettings: IUiSettingsClient;
}

export const MlDatePickerContext = createContext<MlDatePickerDependencies | undefined>(undefined);

export const useMlDatePickerContext = (): MlDatePickerDependencies => {
  const mlDatePickerContext = useContext(MlDatePickerContext);

  // if `undefined`, throw an error
  if (mlDatePickerContext === undefined) {
    throw new Error('mlDatePickerContext was used outside of its Provider');
  }

  return mlDatePickerContext;
};

export const MlDatePickerContextProvider: FC<{ deps: MlDatePickerDependencies }> = ({
  children,
  deps,
}) => {
  return <MlDatePickerContext.Provider value={deps}>{children}</MlDatePickerContext.Provider>;
};
