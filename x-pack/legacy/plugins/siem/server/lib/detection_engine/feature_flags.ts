/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Very temporary file where we put our feature flags for detection lists.
// We need to use an environment variable and CANNOT use a kibana.dev.yml setting because some definitions
// of things are global in the modules are are initialized before the init of the server has a chance to start.
// TODO: Delete this once the lists features are within the product and in a particular version

// Set this in your .bashrc/.zshrc to turn on lists feature
// NOTE: This feature is backwards compatible but not forwards compatible meaning once you set it and begin using it
// you cannot easily go back without it unless you reset your data previously.
export const envVariableName = 'ELASTIC_XPACK_SIEM_LISTS_FEATURE';

// Use this to detect if the lists feature is enabled or not
export const hasListsFeature = (): boolean => {
  return process.env[envVariableName]?.trim().toLowerCase() === 'true';
};

// This is for tests only to use
let setFeatureFlagsForTestsOnlyCalled = false;

// This is for tests only to use in your beforeAll() calls
export const setFeatureFlagsForTestsOnly = (): void => {
  if (setFeatureFlagsForTestsOnlyCalled) {
    throw new Error(
      'In your tests you need to ensure in your afterEach/afterAll blocks you are calling unSetFeatureFlagsForTestsOnly'
    );
  } else {
    setFeatureFlagsForTestsOnlyCalled = true;
    process.env[envVariableName] = 'true';
  }
};

// This is for tests only to use in your afterAll() calls
export const unSetFeatureFlagsForTestsOnly = (): void => {
  if (!setFeatureFlagsForTestsOnlyCalled) {
    throw new Error(
      'In your tests you need to ensure in your beforeEach/beforeAll blocks you are calling setFeatureFlagsForTestsOnly'
    );
  } else {
    delete process.env[envVariableName];
    setFeatureFlagsForTestsOnlyCalled = false;
  }
};
