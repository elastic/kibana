/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';

const ALERTING_V2_RULES_API_PATH = '/api/alerting/v2/rules';
const ALERTING_V2_API_VERSION = '2023-10-31';

/**
 * Delete ALL alerting v2 rules in the current space, along with their task-manager executor
 * tasks (rule deletion unschedules them). Between live-eval runs this prevents rules promoted
 * by a previous scenario from firing signals into the fresh run.
 *
 * Deliberately `match_all`: the eval cluster is dedicated, and the only alerting v2 rules on it
 * are the ones the significant-events pipeline installed.
 */
export async function deleteAllSignalRules(kbnClient: KbnClient, log: ToolingLog): Promise<void> {
  try {
    const response = await kbnClient.request<{ affected_count?: number; match_count?: number }>({
      path: `${ALERTING_V2_RULES_API_PATH}/_delete_by_query`,
      method: 'POST',
      headers: { 'elastic-api-version': ALERTING_V2_API_VERSION },
      body: { match_all: true, force: true },
      retries: 0,
    });
    const deleted = response.data.affected_count ?? 0;
    log.info(`deleteAllSignalRules: deleted ${deleted} alerting v2 rule(s)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // 404: alerting v2 routes not registered on this deployment. 503 ALERTING_DISABLED: the
    // `alerting:v2:enabled` advanced setting is off — the HTTP surface is gated but the
    // significant-events pipeline installs rules through the server-side client regardless,
    // so there is nothing this cleanup can (or needs to) reach.
    if (message.includes('404') || message.includes('ALERTING_DISABLED')) {
      log.debug('deleteAllSignalRules: alerting v2 HTTP surface unavailable — skipping');
      return;
    }
    throw error;
  }
}
