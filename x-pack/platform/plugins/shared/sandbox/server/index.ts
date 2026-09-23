/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `@kbn/sandbox-plugin` — server-side public API.
 *
 * The sandbox plugin exposes gVisor sandbox pods to other Kibana plugins via a
 * simple session abstraction. Declare `sandbox` as an optional plugin in your
 * `kibana.jsonc` and consume {@link SandboxPluginStart} from your `start` deps.
 *
 * **Configuration** (`kibana.yml` / `kibana.dev.yml`):
 * ```yaml
 * xpack.sandbox:
 *   enabled: true
 *   host: <sandbox-api-host>
 *   port: 9090          # gRPC port (default)
 *   api_key: <key>
 *   ssl:
 *     certificate_authorities: <PEM>   # optional CA for server cert verification
 *     certificate: <PEM>               # client cert (mTLS)
 *     key: <PEM>                       # client key  (mTLS)
 * ```
 *
 * When `enabled` is `false` (the default), or when `api_key`/`ssl` are absent,
 * `SandboxPluginStart.getSession` throws a descriptive error for every call.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export { config } from './config';
export type { SandboxPluginConfig } from './config';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { SandboxPlugin } = await import('./plugin');
  return new SandboxPlugin(initializerContext);
}

export type { SandboxSession } from './sandbox_session';
export type { SandboxPluginSetup, SandboxPluginStart } from './plugin';
export type {
  RunCommandParams,
  RunCommandResult,
  FileMetadata,
  ReadFileResult,
  WriteFileResult,
} from './grpc_client';
