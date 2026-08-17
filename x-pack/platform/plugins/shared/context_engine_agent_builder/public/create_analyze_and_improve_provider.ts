/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AnalyzeAndImproveProvider } from '@kbn/context-engine-plugin/public/types';
import type { ApplicationStart } from '@kbn/core/public';

const AGENT_BUILDER_CAPABILITY = 'agentBuilder';

/** Disabled until signal-analysis hand-off is implemented (elastic/kibana#283044). */
const ANALYZE_AND_IMPROVE_ENABLED = false;

export const createAnalyzeAndImproveProvider = ({
  agentBuilder,
  application,
}: {
  agentBuilder: AgentBuilderPluginStart | undefined;
  application: ApplicationStart;
}): AnalyzeAndImproveProvider => ({
  canAnalyze: ({ aiIndex }) =>
    ANALYZE_AND_IMPROVE_ENABLED &&
    aiIndex !== undefined &&
    application.capabilities[AGENT_BUILDER_CAPABILITY]?.show === true &&
    agentBuilder?.openChat !== undefined,

  analyzeAndImprove: (_context) => {
    if (!agentBuilder?.openChat) {
      return;
    }

    // TODO: open Agent Builder with signal-analysis context.
  },
});
