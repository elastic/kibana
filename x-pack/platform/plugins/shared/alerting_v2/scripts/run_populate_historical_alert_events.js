/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Launcher for populate_historical_alert_events.ts so it runs with Kibana's
 * Babel register and module resolution. Run from plugin directory:
 *
 *   node scripts/run_populate_historical_alert_events.js [--count 100 ...]
 *
 * Or from repo root:
 *
 *   node x-pack/platform/plugins/shared/alerting_v2/scripts/run_populate_historical_alert_events.js [--count 100 ...]
 */

require('@kbn/setup-node-env');
require('@kbn/babel-register').install();

require('./populate_historical_alert_events.ts');
