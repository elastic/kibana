/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { OpencodeSubagentExecutor, type OpencodeSubagentConfig } from './executor';
import { OpencodeRunClient } from './persistence/run_client';
import { McpAuthMinter } from './mcp_auth_minter';
import { ElasticCliCredentialMinter } from './elastic_cli_credential_minter';
import { SandboxCliCredentialResolver } from './sandbox_cli_credential_resolver';

/**
 * PoC provider for the OpenCode sub-agent executor.
 *
 * Threading full plugin config through the runner/tool context is a large,
 * invasive change; for this experimental feature we register the executor once
 * at plugin start via a module-level holder, and the internal-tool registration
 * reads it lazily. This is intentionally scoped to the experimental
 * `opencodeSubagent` feature flag, so it never affects default execution.
 */
let executor: OpencodeSubagentExecutor | undefined;
let runClient: OpencodeRunClient | undefined;

export const initOpencodeSubagentExecutor = ({
  config,
  logger,
  esClient,
  security,
  getActions,
}: {
  config: OpencodeSubagentConfig;
  logger: Logger;
  /** Internal-user ES client used to persist run history keyed by conversation. */
  esClient: ElasticsearchClient;
  /** Used to mint/revoke the per-run scoped MCP loopback credential. */
  security: SecurityServiceStart;
  /** Actions start, to resolve connector-owned sandbox credentials. */
  getActions: () => Promise<ActionsPluginStart>;
}): void => {
  runClient = new OpencodeRunClient(esClient, logger.get('runs'));
  const mcpAuthMinter = new McpAuthMinter(security, logger.get('mcpAuth'));
  const elasticCliCredentialMinter = new ElasticCliCredentialMinter(
    security,
    logger.get('elasticCli')
  );
  const sandboxCliCredentialResolver = new SandboxCliCredentialResolver(
    getActions,
    logger.get('sandboxCliCredentials')
  );
  executor = new OpencodeSubagentExecutor(
    config,
    logger,
    runClient,
    mcpAuthMinter,
    sandboxCliCredentialResolver,
    elasticCliCredentialMinter
  );
  // Reap any sandbox pods orphaned by a previous process (e.g. a hot-reload that
  // killed the runtime mid-run). Fire-and-forget; never blocks startup.
  void executor.sweepOrphans();
};

export const getOpencodeSubagentExecutor = (): OpencodeSubagentExecutor | undefined => executor;

export const getOpencodeRunClient = (): OpencodeRunClient | undefined => runClient;

/**
 * Stop the reaper and tear down all warm sandboxes. Call on plugin stop so warm
 * pods don't outlive Kibana. Never throws.
 */
export const stopOpencodeSubagentExecutor = async (): Promise<void> => {
  const current = executor;
  executor = undefined;
  runClient = undefined;
  if (current) {
    try {
      await current.shutdown();
    } catch {
      // best-effort
    }
  }
};
