/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
require('../../../../../../../../../src/setup_node_env');
const extractGrokPatternDangerouslySlow =
  require('@kbn/grok-heuristics').extractGrokPatternDangerouslySlow;

module.exports = (payload) => {
  return extractGrokPatternDangerouslySlow(payload.messages);
};
