/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';

// Playwright spawns child processes, where we also need to initialize
// OpenTelemetry tracing. NODE_OPTIONS will be propagated through to
// these child processes.
const requireArg = Path.join(__dirname, './require_init_apm.js');

process.env.NODE_OPTIONS = [
  process.env.NODE_OPTIONS,
  // '--trace-deprecation',
  // '--trace-warnings',
  `--require ${requireArg}`,
]
  .filter(Boolean)
  .join(' ');

process.on('warning', (warning) => {
  console.log(warning.stack);
});

export default function globalSetup() {
  // we export a dummy function so playwright doesn't complain
  // and we put it inside the function body to prevent
  // unfixable lint errors (I love software)
}
