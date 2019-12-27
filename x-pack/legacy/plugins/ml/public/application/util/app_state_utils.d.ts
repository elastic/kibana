/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';

export const initializeAppState: (
  appState: any,
  setAppState: any,
  stateName: any,
  defaultState: any
) => any;

export const useAppStateToObservableSubscription: (
  appStateName: string,
  o$: Observable<any>
) => any;
