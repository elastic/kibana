/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Auto-mock the locator context for all alerting_v2 tests so components
// that call useAlertingLocators() don't require a LocatorProvider wrapper.
jest.mock('./public/application/locator_context');
