/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';

// Tier tests do not need the heavy Fleet/Docker provisioning that the main
// osquery tests use — they only verify that the osquery UI is hidden or shown
// based on the product tier. A simple globalSetupHook is sufficient.
globalSetupHook();
