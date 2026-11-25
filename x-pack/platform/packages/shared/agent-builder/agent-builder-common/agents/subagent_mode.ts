/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * How a sub-agent invocation via `run_subagent` behaves w.r.t. persistence:
 * - `transient`: fire-and-forget standalone execution, no conversation, cannot be resumed.
 * - `persistent`: backed by a child conversation, addressable by name via `send_message`.
 */
export enum SubagentMode {
  transient = 'transient',
  persistent = 'persistent',
}
