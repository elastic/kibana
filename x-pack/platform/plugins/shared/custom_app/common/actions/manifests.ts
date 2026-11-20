/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerAction, type AnyAction } from '@kbn/custom-app-registry';
import { closeFlyoutAction } from './close_flyout/manifest';
import { openFlyoutAction } from './open_flyout/manifest';
import { setStateAction } from './set_state/manifest';

/** The actions that ship with custom apps. A new one is a folder of its own and a line here. */
export const BUILTIN_ACTIONS = [setStateAction, openFlyoutAction, closeFlyoutAction] as const;

/** Registers the actions that ship with custom apps. It can be called more than once. */
export const registerBuiltinActions = (): void => {
  BUILTIN_ACTIONS.forEach((action) => registerAction(action as unknown as AnyAction));
};
