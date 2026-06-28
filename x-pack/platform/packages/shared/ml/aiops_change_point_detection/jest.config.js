/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<<< HEAD:x-pack/platform/packages/shared/ml/aiops_change_point_detection/jest.config.js
module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../../..',
  roots: ['<rootDir>/x-pack/platform/packages/shared/ml/aiops_change_point_detection'],
};
========
export const bulkRemoveSourceOperationsFactory = jest
  .fn()
  .mockReturnValue(() => [{ update: {} }, { script: {} }]);
export const applyBulkRemoveSource = jest.fn().mockResolvedValue(undefined);
>>>>>>>> 9.4:x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/watchlists/entity_sources/bulk/__mocks__/soft_delete.ts
