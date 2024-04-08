/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../..',
  roots: ['<rootDir>/x-pack/packages/ml/inference_integration_flyout'],
};


module.exports = {
  preset: '@kbn/test/jest_node',
  rootDir: '../../../..',

  roots: ['<rootDir>/x-pack/packages/ml/kibana_theme'],
};
