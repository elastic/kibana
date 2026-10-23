/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Starts the PDF thread from source: a worker does not inherit the host's transpiler, so this registers
// Kibana's before loading `pdf_worker.ts`. A packaged Kibana loads the built `pdf_worker.js` instead.

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
require('@kbn/setup-node-env');
// eslint-disable-next-line @kbn/imports/uniform_imports
require('./pdf_worker.ts');
