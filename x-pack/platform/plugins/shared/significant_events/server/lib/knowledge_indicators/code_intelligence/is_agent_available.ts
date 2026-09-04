/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { CODEBOX_CONNECTOR_ID } from './codebox_client';

/**
 * Whether the Codebox code-research ecosystem is provisioned and available.
 *
 * Gates on the Codebox `.http` connector (deterministic ID
 * {@link CODEBOX_CONNECTOR_ID}) being registered in the Actions plugin. The
 * connector is provisioned by `codebox install.ts` alongside the workflow-backed
 * `git-*` tools, skills, and the code-research agent — so its presence implies
 * the full Codebox toolchain is installed.
 *
 * Code Intelligence is only useful when this connector exists and can reach a
 * running Codebox instance. The connector is installed independently, not by
 * this plugin, so extraction gates on its presence and disables itself
 * gracefully when it is absent.
 *
 * Returns `false` (never throws) so callers can treat any lookup failure as
 * "unavailable".
 */
export const isCodeIntelligenceAgentAvailable = async ({
  actions,
  request,
  logger,
}: {
  /** @deprecated Kept for call-site compat; unused. */
  agentBuilder?: unknown;
  actions: ActionsPluginStart;
  request: KibanaRequest;
  logger: Logger;
}): Promise<boolean> => {
  try {
    const actionsClient = await actions.getActionsClientWithRequest(request);
    const connector = await actionsClient.get({ id: CODEBOX_CONNECTOR_ID });
    return connector != null;
  } catch (error) {
    logger.warn(
      `code_intelligence: Codebox connector "${CODEBOX_CONNECTOR_ID}" not available: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
};
