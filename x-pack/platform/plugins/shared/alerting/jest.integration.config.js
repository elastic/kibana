/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/jest/jest_integration',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/platform/plugins/shared/alerting'],
  testPathIgnorePatterns: [
    '<rootDir>/x-pack/platform/plugins/shared/alerting/server/registry_checks/alert_as_data_fields.test.ts',
    '<rootDir>/x-pack/platform/plugins/shared/alerting/server/registry_checks/serverless_upgrade_and_rollback_checks.test.ts',
  ],
};
