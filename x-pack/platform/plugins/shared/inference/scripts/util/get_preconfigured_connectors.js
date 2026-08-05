/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/babel-register').install();

const { getStringifiedConnectorsFromConfig } = require('./load_connectors_from_env');

const connectors = getStringifiedConnectorsFromConfig();
if (connectors) {
  process.stdout.write(connectors);
}
