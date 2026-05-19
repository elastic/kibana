/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
// eslint-disable-next-line no-restricted-imports
import { test as base } from '@playwright/test';

/**
 * Playwright teardown project — runs once, after all UI specs in the `local`
 * project complete, regardless of pass/fail.
 *
 * Why this exists
 * ---------------
 * `global.setup.ts` starts three long-lived Docker containers
 * (`scout-fleet-server`, `scout-osquery-agent-0`, `scout-osquery-agent-1`) so
 * tests can exercise a real Fleet-managed osquery agent. The setup hook only
 * registers SIGINT/SIGTERM handlers, which fire for interactive Ctrl-C runs
 * but NOT for normal Playwright completion — its workers exit cleanly, the
 * process terminates without a signal, and the containers are left running.
 * CI re-uses the host across jobs and local devs end up with zombie agents
 * reporting to a Kibana that no longer exists.
 *
 * This teardown is idempotent: `docker rm -f` on a missing container is a
 * no-op, so a skipped setup (Docker unavailable, reuse-existing path, etc.)
 * still teardown cleanly.
 */
const CONTAINERS = ['scout-fleet-server', 'scout-osquery-agent-0', 'scout-osquery-agent-1'];

const teardown = base;

teardown('stop osquery fleet containers', async () => {
  // Short per-container timeout so a hung Docker daemon never wedges CI.
  for (const name of CONTAINERS) {
    try {
      await execa('docker', ['rm', '-f', name], { timeout: 30_000, reject: false });
    } catch {
      // Container may already be removed, Docker may be unavailable — nothing
      // we can do from here, and we don't want teardown to fail the whole run.
    }
  }
});
