/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Legacy testbed pattern exports (to be removed)
export * from './actions';

export { setupEnvironment, WithAppDependencies } from './setup_environment';
export { renderWithDependencies as renderWithDependenciesLegacy } from './render';

// Pure RTL pattern exports (new)
export * from './rtl_helpers';
export { renderEditPolicy, renderWithDependencies } from './rtl_render';
