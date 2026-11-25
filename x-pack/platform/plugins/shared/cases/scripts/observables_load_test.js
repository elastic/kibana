/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Load test for case observables at scale: bulk adds observables to cases, times the observables
 * list, case reads with the preview and case delete, and measures rule status writes in the shared
 * index meanwhile. Writes a JSON report.
 *
 *   node x-pack/platform/plugins/shared/cases/scripts/observables_load_test.js \
 *     --kibana http://localhost:5601 --observables 10000 --cases 1
 *
 * Run with --help for every option.
 */
require('@kbn/setup-node-env');
require('./observables_load_test/main');
