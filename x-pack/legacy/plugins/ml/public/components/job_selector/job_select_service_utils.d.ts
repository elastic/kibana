/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';

import { State } from 'ui/state_management/state';

export declare type JobSelectService$ = BehaviorSubject<{
  selection: string[];
  groups: string[];
  resetSelection: boolean;
}>;

declare interface JobSelectService {
  jobSelectService$: JobSelectService$;
  unsubscribeFromGlobalState(): void;
}

export const jobSelectServiceFactory: (globalState: State) => JobSelectService;
