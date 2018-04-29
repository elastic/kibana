/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../../src/ui/public/chrome', () => ({
  addBasePath: path => `/kibanaBasePath${path}`,
  getInjected: jest.fn(name => `mocked_value_for:${name}`),
}));
