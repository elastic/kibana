/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';

import { UrlState } from '../../util/url_state';

export const getSelectedJobIds: (
  globalState: UrlState
) => { jobIds: string[]; selectedGroups: string[] };

export declare type JobSelectService$ = BehaviorSubject<{
  selection: string[];
  groups: string[];
  resetSelection: boolean;
}>;

export const getJobSelectService$: (globalState: UrlState) => JobSelectService$;
