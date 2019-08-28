/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// We only export UiContext but not any custom hooks, because if we'd import them
// from here, mocking the hook from jest tests won't work as expected.
export { UiContext } from './ui_context';
