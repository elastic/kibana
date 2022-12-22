/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

// import { CoreStart } from '@kbn/core/public';
// import { KibanaReactContextValue, useKibana } from '@kbn/kibana-react-plugin/public';
// import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
// import type { DataVisualizerStartDependencies } from '../plugin';

export interface DatePickerServices {
  dummyService: string;
}

export type KibanaServices = Partial<DatePickerServices>;

export interface DatePickerContextValue<Services extends KibanaServices> {
  readonly services: Services;
}

const defaultContextValue = {
  services: {},
};

export const sharedDatePickerContext =
  createContext<DatePickerContextValue<KibanaServices>>(defaultContextValue);

export const useKibanaDatePicker = <Extra extends object = {}>(): DatePickerContextValue<
  KibanaServices & Extra
> =>
  useContext(
    sharedDatePickerContext as unknown as React.Context<
      DatePickerContextValue<KibanaServices & Extra>
    >
  );
