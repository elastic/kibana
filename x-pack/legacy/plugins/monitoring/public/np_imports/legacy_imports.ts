/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Last remaining 'ui/*' imports that will eventually be shimmed with their np alternatives
 */

export { npSetup, npStart } from 'ui/new_platform';
// @ts-ignore
export { GlobalStateProvider } from 'ui/state_management/global_state';
// @ts-ignore
export { StateManagementConfigProvider } from 'ui/state_management/config_provider';
// @ts-ignore
export { AppStateProvider } from 'ui/state_management/app_state';
// @ts-ignore
export { EventsProvider } from 'ui/events';
export { PersistedState } from 'ui/persisted_state';
// @ts-ignore
export { createTopNavDirective, createTopNavHelper } from 'ui/kbn_top_nav/kbn_top_nav';
// @ts-ignore
export { KbnUrlProvider, RedirectWhenMissingProvider } from 'ui/url';
export { registerTimefilterWithGlobalStateFactory } from 'ui/timefilter/setup_router';
