/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Re-export the global setup from scout_osquery — the Fleet/Docker infrastructure
// setup is identical for tier tests. The `globalSetupHook` calls in the original
// file are side-effectful and register when imported.
import '../../../scout_osquery/ui/tests/global.setup';
