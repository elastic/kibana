/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reserved agent id acting as a self-fork sentinel in
 * {@link AgentConfiguration.subagent_ids}. Not a real, storable agent id —
 * `validateAgentId` rejects it on both `builtIn: true` and `builtIn: false`
 * paths. At runtime, `_self` in a resolved allowlist substitutes to the
 * executing agent's real id only at the `SubAgentExecutor.executeSubAgent`
 * call seam; everywhere else the sentinel stays visible so telemetry, logs,
 * and the LLM tool schema can distinguish self-fork from an explicit id.
 */
export const SELF_AGENT_ID = '_self' as const;
