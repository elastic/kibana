/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The menu loads lazily through one shared chunk; see `ui/lazy_actions_menu_popover.tsx`.
export { ActionsMenuPopover, useWarmActionsMenu } from './ui/lazy_actions_menu_popover';
export type {
  ActionOptionData,
  ActionsMenuInsertionContext,
  ActionsMenuPresentation,
} from './types';
