/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Separate install status type for the UI, which overlaps with common/types/InstallationStatus,
// look into finding a way to combine them?
export enum InstallStatus {
  installed = 'installed',
  notInstalled = 'not_installed',
  installing = 'installing',
  uninstalling = 'uninstalling',
}
