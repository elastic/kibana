/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { defineConfig, mergeConfig } = require('vitest/config');
const preset = require('@kbn/vitest/node_preset');

module.exports = mergeConfig(preset, defineConfig({ test: { root: __dirname } }));
