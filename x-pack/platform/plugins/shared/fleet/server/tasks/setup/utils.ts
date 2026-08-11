/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TASK_TYPE = 'fleet:setup';
export const TASK_TITLE = 'Fleet setup operations';
export const TASK_TIMEOUT = '10m';

export interface SetupTaskParams {
  type:
    | 'backportPackagePolicyInputId'
    | 'migrateComponentTemplateILMs'
    | 'upgradePackageInstallVersion'
    | 'reinstallPackagesForGlobalAssetUpdate';
}
