/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  listsEnvFeatureFlagName,
  hasListsFeature,
  unSetFeatureFlagsForTestsOnly,
  setFeatureFlagsForTestsOnly,
} from './feature_flags';

describe('feature_flags', () => {
  beforeAll(() => {
    delete process.env[listsEnvFeatureFlagName];
  });

  afterEach(() => {
    delete process.env[listsEnvFeatureFlagName];
  });

  describe('hasListsFeature', () => {
    test('hasListsFeature should return false if process.env is not set', () => {
      expect(hasListsFeature()).toEqual(false);
    });

    test('hasListsFeature should return true if process.env is set to true', () => {
      process.env[listsEnvFeatureFlagName] = 'true';
      expect(hasListsFeature()).toEqual(true);
    });

    test('hasListsFeature should return false if process.env is set to false', () => {
      process.env[listsEnvFeatureFlagName] = 'false';
      expect(hasListsFeature()).toEqual(false);
    });

    test('hasListsFeature should return false if process.env is set to a non true value', () => {
      process.env[listsEnvFeatureFlagName] = 'something else';
      expect(hasListsFeature()).toEqual(false);
    });
  });

  describe('setFeatureFlagsForTestsOnly', () => {
    test('it can be called once and sets the environment variable for tests', () => {
      setFeatureFlagsForTestsOnly();
      expect(process.env[listsEnvFeatureFlagName]).toEqual('true');
      unSetFeatureFlagsForTestsOnly(); // This is needed to not pollute other tests since this has to be paired
    });

    test('if it is called twice it throws an exception', () => {
      setFeatureFlagsForTestsOnly();
      expect(() => setFeatureFlagsForTestsOnly()).toThrow(
        'In your tests you need to ensure in your afterEach/afterAll blocks you are calling unSetFeatureFlagsForTestsOnly'
      );
      unSetFeatureFlagsForTestsOnly(); // This is needed to not pollute other tests since this has to be paired
    });

    test('it can be called twice as long as unSetFeatureFlagsForTestsOnly is called in-between', () => {
      setFeatureFlagsForTestsOnly();
      unSetFeatureFlagsForTestsOnly();
      setFeatureFlagsForTestsOnly();
      expect(process.env[listsEnvFeatureFlagName]).toEqual('true');
      unSetFeatureFlagsForTestsOnly(); // This is needed to not pollute other tests since this has to be paired
    });
  });

  describe('unSetFeatureFlagsForTestsOnly', () => {
    test('it can sets the value to undefined', () => {
      setFeatureFlagsForTestsOnly();
      unSetFeatureFlagsForTestsOnly();
      expect(process.env[listsEnvFeatureFlagName]).toEqual(undefined);
    });

    test('it can not be be called before setFeatureFlagsForTestsOnly without throwing', () => {
      expect(() => unSetFeatureFlagsForTestsOnly()).toThrow(
        'In your tests you need to ensure in your beforeEach/beforeAll blocks you are calling setFeatureFlagsForTestsOnly'
      );
    });

    test('if it is called twice it throws an exception', () => {
      setFeatureFlagsForTestsOnly();
      unSetFeatureFlagsForTestsOnly();
      expect(() => unSetFeatureFlagsForTestsOnly()).toThrow(
        'In your tests you need to ensure in your beforeEach/beforeAll blocks you are calling setFeatureFlagsForTestsOnly'
      );
    });

    test('it can be called twice as long as setFeatureFlagsForTestsOnly is called in-between', () => {
      setFeatureFlagsForTestsOnly();
      unSetFeatureFlagsForTestsOnly();
      setFeatureFlagsForTestsOnly();
      unSetFeatureFlagsForTestsOnly();
      expect(process.env[listsEnvFeatureFlagName]).toEqual(undefined);
    });
  });
});
