/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Setup Node environment first
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
require('../../../../../../../../src/setup_node_env');

// Import the extractTemplate function
const { syncExtractTemplate } = require('./extract_template');

/**
 * Worker thread function that processes messages and extracts templates
 * @param {string[]} messages - Array of log messages to extract a template from
 * @returns {Object} The extraction result
 */
module.exports = function (messages) {
  return syncExtractTemplate(messages);
};
