/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createAction } from 'redux-actions';

export interface PopoverState {
  id: string;
  open: boolean;
}

export type UiPayload = PopoverState & string & number & Map<string, string[]>;

export const setBasePath = createAction<string>('SET BASE PATH');
export const triggerAppRefresh = createAction<number>('REFRESH APP');

export const setFilters = createAction<Map<string, string[]>>('SET FILTERS');
export const toggleIntegrationsPopover = createAction<PopoverState>(
  'TOGGLE INTEGRATION POPOVER STATE'
);
