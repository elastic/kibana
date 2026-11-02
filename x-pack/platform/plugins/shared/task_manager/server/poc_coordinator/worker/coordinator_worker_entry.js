/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC: coordination/execution seam — DEV-MODE worker entry.
 *
 * Worker threads start a fresh module context without Kibana's on-the-fly
 * TypeScript transpiler, so install it before loading the TS worker module
 * (kbn-workflow-yaml-validate-cli pattern).
 *
 * In dist builds this file is NOT used: the bridge detects the compiled
 * coordinator_worker.js sibling and points the Worker at it directly
 * (screenshotting/pdfmaker pattern), so no dynamic require is needed here.
 */

require('@kbn/setup-node-env');
require('./coordinator_worker');
