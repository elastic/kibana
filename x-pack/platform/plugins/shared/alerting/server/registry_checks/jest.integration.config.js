/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = {
  preset: '@kbn/jest/jest_integration',
  rootDir: '../../../../../../..',
  roots: ['<rootDir>/x-pack/platform/plugins/shared/alerting'],
  testMatch: [
    '<rootDir>/x-pack/platform/plugins/shared/alerting/server/integration_tests/alert_as_data_fields.test.ts',
    '<rootDir>/x-pack/platform/plugins/shared/alerting/server/integration_tests/serverless_upgrade_and_rollback_checks.test.ts',
  ],
};
