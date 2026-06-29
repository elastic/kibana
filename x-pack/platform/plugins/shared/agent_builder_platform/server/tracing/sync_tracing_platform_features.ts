/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import {
  syncAgentBuilderOverviewDashboard,
  syncAgentBuilderOverviewDashboardForSpace,
} from '../dashboard';
import { registerTracingSkill, unregisterTracingSkill } from '../skills';

export async function syncTracingPlatformFeatures({
  coreStart,
  agentBuilder,
  logger,
  enabled,
  spaceId,
}: {
  coreStart: Pick<CoreStart, 'savedObjects'>;
  agentBuilder: AgentBuilderPluginStart;
  logger: Logger;
  enabled: boolean;
  spaceId?: string;
}): Promise<void> {
  if (spaceId) {
    await syncAgentBuilderOverviewDashboardForSpace(coreStart, enabled, spaceId, logger);
  } else {
    await syncAgentBuilderOverviewDashboard(coreStart, enabled, logger);
  }

  if (enabled) {
    await registerTracingSkill(agentBuilder);
  } else {
    await unregisterTracingSkill(agentBuilder);
  }
}
