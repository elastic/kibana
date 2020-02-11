/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { importRulesRoute } from './import_rules_route';

describe('import_rules_route', () => {
  describe('status codes with savedObjectsClient and alertClient', () => {
    test('returns 200 when importing a rule with a valid savedObjectsClient and alertClient', async () => {});

    test('returns 404 if alertClient is not available on the route', async () => {});

    test('returns 404 if savedObjectsClient is not available on the route', async () => {});
  });

  describe('payload', () => {
    test('returns 400 if file extension type is not .ndjson', async () => {});
  });

  describe('single rule import', () => {
    test('returns 200 if rule imported successfully', async () => {});

    describe('rule with existing rule_id', () => {
      test('returns 200 with reported conflict if `overwrite` is set to `false`', async () => {});

      test('returns 200 with NO reported conflict if `overwrite` is set to `true`', async () => {});
    });
  });

  describe('multi rule import', () => {
    test('returns 200 if all rules imported successfully', async () => {});

    describe('rules with matching rule_id', () => {
      test('returns 200 with reported conflict if `overwrite` is set to `false`', async () => {});

      test('returns 200 with NO reported conflict if `overwrite` is set to `true`', async () => {});
    });

    describe('rules with existing rule_id', () => {
      test('returns 200 with reported conflict if `overwrite` is set to `false`', async () => {});

      test('returns 200 with NO reported conflict if `overwrite` is set to `true`', async () => {});
    });
  });
});
