/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import { useSubjectValue } from '../utils/use_subject_value';
import type { AppRuntime, StateValues } from './app_runtime';

export const AppRuntimeContext = createContext<AppRuntime | undefined>(undefined);

export const useAppRuntime = (): AppRuntime => {
  const runtime = useContext(AppRuntimeContext);
  if (!runtime) throw new Error('useAppRuntime must be used inside an AppRuntimeContext provider');
  return runtime;
};

export const useStateValues = (): StateValues => useSubjectValue(useAppRuntime().state$);

export const useOpenFlyoutId = (): string | undefined =>
  useSubjectValue(useAppRuntime().openFlyoutId$);
