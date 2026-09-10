/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Configuration for the external Deductive execution path.
 *
 * MVP sourcing: environment variables (products may later source these from a
 * Stack Connector's secrets). All values are read lazily at call time so tests
 * and deployments can vary them per-process without restart plumbing.
 */

/**
 * LaunchDarkly feature flag that per-deployment enables the external Deductive
 * execution path (self-managed / LD-unreachable deployments stay off).
 * Registered in elastic/kibana-feature-flags for the controlled rollout.
 */
export const DEDUCTIVE_ENABLED_FLAG = 'agentBuilder.deductiveEnabled';

export const DEFAULT_DEDUCTIVE_ENDPOINT = 'https://turing.deductive.ai';
export const DEDUCTIVE_AGENT_ID = 'deductive.ai';

export const DEDUCTIVE_METADATA_KEY = 'deductive_session_id';

/**
 * Deductive AI logo (source: deductive-ai/deductive desktop/assets/icon.svg),
 * embedded as a data URI so the built-in agent's avatar renders via EuiIcon
 * (string `type` = SVG URL) with no new asset-serving or UI code.
 */
export const DEDUCTIVE_AVATAR_ICON =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB4PSI4MCIgeT0iODAiIHdpZHRoPSI4NjQiIGhlaWdodD0iODY0IiByeD0iMTkwIiBmaWxsPSIjMTExMTEzIi8+CjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI2MiwgMjk1KSBzY2FsZSg0LjUpIj4KPHBhdGggZD0iTTk4LjIxMTggMjcuNzkzMUM5My44MTMzIDI3LjQ2MTkgODkuODE0OSAyOS4xODE2IDg3LjA2NDUgMzIuMDkzN0M4Mi40Njk4IDM2Ljk1ODYgNzYuMDc4NyAzOS43MjQ5IDY5LjM4NTUgMzkuNzI0OUg2OS4zODAyQzYyLjY4NyAzOS43MjQ5IDU2LjI5NTkgMzYuOTYxMiA1MS43MDEzIDMyLjA5MzdDNDguOTUwOSAyOS4xNzg5IDQ0Ljk0OTggMjcuNDU5MyA0MC41NTM5IDI3Ljc5MzFDMzMuNjQwOCAyOC4zMTUxIDI4LjA2MDUgMzQuMDk5NSAyNy43NjkgNDEuMDI1OUMyNy40MzI1IDQ4Ljk2NDYgMzMuNzY4IDU1LjUwNDEgNDEuNjMyNCA1NS41MDQxQzQ1LjQ5MyA1NS41MDQxIDQ4Ljk4IDUzLjkyNzUgNTEuNDkyIDUxLjM4MTFDNTYuMjY2OCA0Ni41NCA2Mi41ODYzIDQzLjUyOTkgNjkuMzg1NSA0My41Mjk5Qzc2LjE4NDcgNDMuNTI5OSA4Mi41MDQzIDQ2LjU0IDg3LjI3OTEgNTEuMzgxMUM4OS43OTEgNTMuOTI0OSA5My4yNzgxIDU1LjUwNDEgOTcuMTM2IDU1LjUwNDFDMTA1IDU1LjUwNDEgMTExLjMzNiA0OC45NjQ2IDExMC45OTkgNDEuMDI1OUMxMTAuNzA4IDM0LjA5OTUgMTA1LjEyOCAyOC4zMTUxIDk4LjIxNDUgMjcuNzkwNUw5OC4yMTE4IDI3Ljc5MzFaIiBmaWxsPSIjMkFEMzU2Ii8+CjxwYXRoIGQ9Ik03MC40NTg3IDAuMDM5NzQ2OUM2Ni4wNjI4IC0wLjI5MTQ3MSA2Mi4wNjE3IDEuNDI4MjEgNTkuMzExMyA0LjM0MDI4QzU0LjcxNCA5LjIwNTIgNDguMzIyOSAxMS45NzE1IDQxLjYyOTcgMTEuOTcxNUg0MS42MjQ0QzM0LjkzMTIgMTEuOTcxNSAyOC41NDAxIDkuMjA1MiAyMy45NDI4IDQuMzQwMjhDMjEuMTk1MSAxLjQyODIxIDE3LjE5NjcgLTAuMjkxNDcxIDEyLjc5ODEgMC4wMzk3NDY5QzUuODg1IDAuNTY0Mzk2IDAuMzA0Njk2IDYuMzQ2MTMgMC4wMTMyMjcgMTMuMjc1MkMtMC4zMjA2MzggMjEuMjEzOCA2LjAxNDg0IDI3Ljc1MzQgMTMuODc2NiAyNy43NTM0QzE3LjczNzIgMjcuNzUzNCAyMS4yMjQyIDI2LjE3NjggMjMuNzMzNSAyMy42MzA0QzI4LjUxMSAxOC43ODkzIDM0LjgyNzkgMTUuNzc5MiA0MS42MjcxIDE1Ljc3OTJDNDguNDI2MyAxNS43NzkyIDU0Ljc0NTggMTguNzg5MyA1OS41MjA2IDIzLjYzMDRDNjIuMDMyNiAyNi4xNzQxIDY1LjUxOTYgMjcuNzUzNCA2OS4zNzc2IDI3Ljc1MzRDNzcuMjQxOSAyNy43NTM0IDgzLjU3NzQgMjEuMjEzOCA4My4yNDA5IDEzLjI3NTJDODIuOTQ5NCA2LjM0ODc4IDc3LjM2OTEgMC41NjQzOTYgNzAuNDU2IDAuMDQyMzk2Nkw3MC40NTg3IDAuMDM5NzQ2OVoiIGZpbGw9IiMyQUQzNTYiLz4KPHBhdGggZD0iTTcwLjQ1ODcgNTUuNTQ2NUM2Ni4wNjI4IDU1LjIxNTMgNjIuMDYxNyA1Ni45MzUgNTkuMzExMyA1OS44NDdDNTQuNzE0IDY0LjcxMiA0OC4zMjI5IDY3LjQ3ODMgNDEuNjI5NyA2Ny40NzgzSDQxLjYyNzFDMzQuOTMzOSA2Ny40NzgzIDI4LjU0MjggNjQuNzEyIDIzLjk0NTUgNTkuODQ3QzIxLjE5NTEgNTYuOTM1IDE3LjE5NCA1NS4yMTUzIDEyLjc5ODEgNTUuNTQ2NUM1Ljg4NSA1Ni4wNjg1IDAuMzA0Njk2IDYxLjg1MjkgMC4wMTMyMjcgNjguNzc5M0MtMC4zMjA2MzggNzYuNzE3OSA2LjAxNDg0IDgzLjI1NzUgMTMuODc2NiA4My4yNTc1QzE3LjczNzIgODMuMjU3NSAyMS4yMjQyIDgxLjY4MDkgMjMuNzMzNSA3OS4xMzQ1QzI4LjUxMSA3NC4yOTM0IDM0LjgyNzkgNzEuMjgzMyA0MS42MjcxIDcxLjI4MzNDNDguNDI2MyA3MS4yODMzIDU0Ljc0NTggNzQuMjkzNCA1OS41MjMzIDc5LjEzNDVDNjIuMDM1MiA4MS42NzgzIDY1LjUyMjIgODMuMjU3NSA2OS4zODAyIDgzLjI1NzVDNzcuMjQ0NiA4My4yNTc1IDgzLjU4MDEgNzYuNzE3OSA4My4yNDM2IDY4Ljc3OTNDODIuOTUyMSA2MS44NTI5IDc3LjM3MTggNTYuMDY4NSA3MC40NTg3IDU1LjU0NjVaIiBmaWxsPSIjMkFEMzU2Ii8+CjwvZz4KPC9zdmc+Cg==';
interface DeductiveEnvConfig {
  /** Base URL of the Deductive chat API (no trailing slash). */
  endpoint: string;
  /** Bearer token. `dak_` (API key) or `dat_` (OAuth access token). */
  token: string | undefined;
  /** Optional OAuth refresh token; enables automatic refresh on 401. */
  refreshToken: string | undefined;
  /** Optional `X-Team-Id` header override (only meaningful for OAuth tokens). */
  teamId: string | undefined;
}

/**
 * Env-var sourced configuration used as a dev fallback and as the source of
 * refresh-token/team-id extras that the Advanced Settings UI does not expose.
 * Advanced Settings (when populated) take precedence for endpoint/key/agentIds.
 */
export const getEnvDeductiveConfig = (): DeductiveEnvConfig => {
  return {
    endpoint: (process.env.DEDUCTIVE_ENDPOINT ?? DEFAULT_DEDUCTIVE_ENDPOINT).replace(/\/+$/, ''),
    token: process.env.DEDUCTIVE_API_KEY || undefined,
    refreshToken: process.env.DEDUCTIVE_REFRESH_TOKEN || undefined,
    teamId: process.env.DEDUCTIVE_TEAM_ID || undefined,
  };
};

/**
 * Resolves the effective Deductive configuration, preferring per-deployment
 * Advanced Settings (via the run context) over env vars. Env remains a dev
 * fallback so local runs without Advanced Settings keep working.
 */
export const resolveDeductiveConfig = (contextDeductive?: {
  enabled?: boolean;
  endpoint?: string;
  apiKey?: string;
}): {
  enabled: boolean;
  endpoint: string;
  token: string | undefined;
  refreshToken: string | undefined;
  teamId: string | undefined;
} => {
  const env = getEnvDeductiveConfig();
  const configFromSettings = contextDeductive?.enabled === true;

  if (configFromSettings) {
    // Advanced Settings are the authoritative per-deployment config: endpoint, key, agent
    // ids all come FROM the UI. Env extras (refresh token / team) must NOT leak in — a
    // differet env refresh token (e.g. the turing OAuth one) would otherwise be replayed
    // against the wrong cluster and 401 on /auth/refresh.
    return {
      enabled: true,
      endpoint:
        (contextDeductive.endpoint ?? env.endpoint).trim().replace(/\/+$/, '') || env.endpoint,
      token: contextDeductive.apiKey ?? undefined,
      refreshToken: undefined,
      teamId: undefined,
    };
  }

  // Env/dev fallback (no settings configured).
  return {
    enabled: false,
    endpoint: env.endpoint,
    token: env.token,
    refreshToken: env.refreshToken,
    teamId: env.teamId,
  };
};

/**
 * Returns true when the given agent id is routed to the external Deductive
 * execution path. Routing is intentionally fixed to the built-in
 * `deductive.ai` agent.
 */
export const shouldUseDeductive = (agentId: string | undefined): boolean => {
  return agentId === DEDUCTIVE_AGENT_ID;
};
