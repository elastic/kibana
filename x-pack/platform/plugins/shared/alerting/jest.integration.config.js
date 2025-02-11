/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  // TODO remove the line below once we've addressed all the open handles
  // We stop the server very soon, and plugins installing (and retrying indices) might keep Kibana running until a timeout occurs.
  // to do so, we must fix all integration tests first
  // see https://github.com/elastic/kibana/pull/130255/
  forceExit: true,
  preset: '@kbn/test/jest_integration_node',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/platform/plugins/shared/alerting'],
};
