/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Capability token gating access to unredacted `sensitiveOutput` action results in
 * `ActionExecutor.execute()`. Created exactly once, here, as a module-private
 * constant. It is deliberately never re-exported from this plugin's public
 * `server/index.ts` — the only sanctioned way to obtain it is via the actions
 * plugin's `PluginStartContract.getSensitiveOutputAccessToken()`, which a
 * dependent plugin can only reach by declaring `actions` as a required plugin
 * dependency (see `plugin.ts`).
 *
 * This is a repository-enforced convention with static verification (a repo-wide
 * grep-based test), not a runtime authorization boundary: nothing prevents another
 * plugin from also declaring the `actions` dependency and calling
 * `getSensitiveOutputAccessToken()`. The static check only detects a second,
 * textually-matchable call site in this repository's own CI, after the fact — it
 * does not, and cannot, structurally prevent it. First-party Kibana plugin code is
 * already in the same trust domain (see the connector-provisioning plan's threat
 * model), so this is intentionally a lightweight, detectable-misuse guard rather
 * than a security boundary.
 */
export const SENSITIVE_OUTPUT_ACCESS_TOKEN: unique symbol = Symbol('sensitiveOutputAccess');
