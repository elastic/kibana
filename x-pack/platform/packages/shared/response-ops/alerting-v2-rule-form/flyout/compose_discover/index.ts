/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  ComposeDiscoverFlyout,
  STACKED_FLYOUT_SIZE,
  STACKED_FLYOUT_MIN_WIDTH,
} from './compose_discover_flyout';
export type { ComposeDiscoverFlyoutProps } from './compose_discover_flyout';
export { useEuiFlyoutReregister } from './use_eui_flyout_reregister';

export { QuerySandboxFlyout } from './query_sandbox_flyout';
export type { QuerySandboxFlyoutProps } from './query_sandbox_flyout';

export { QuerySandbox } from './query_sandbox';
export type { QuerySandboxProps } from './query_sandbox';

export type { QueryTab } from './types';
