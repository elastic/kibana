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

export const setAlertFlyoutVisible = createAction<boolean>('TOGGLE ALERT FLYOUT');

export const setBasePath = createAction<string>('SET BASE PATH');

export const triggerAppRefresh = createAction<number>('REFRESH APP');

export const setEsKueryString = createAction<string>('SET ES KUERY STRING');

export const toggleIntegrationsPopover = createAction<PopoverState>(
  'TOGGLE INTEGRATION POPOVER STATE'
);
