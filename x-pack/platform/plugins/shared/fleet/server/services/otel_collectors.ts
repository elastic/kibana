/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_TYPE_OPAMP } from '../../common/constants';
import { agentToOtelCollector } from '../../common/services/agent_to_otel_collector';
import type { OtelCollector } from '../../common/types/rest_spec/otel_collector';

import type { AgentClient } from './agents/agent_service';

const SIGNALS_RUNTIME_FIELD = {
  signals: {
    type: 'keyword' as const,
    script: {
      source: `
        if (params._source?.effective_config?.service?.pipelines == null) return;
        def seen = new HashSet();
        for (def k : params._source.effective_config.service.pipelines.keySet()) {
          int i = k.indexOf('/');
          def seg = i == -1 ? k : k.substring(0, i);
          if (seen.add(seg)) emit(seg);
        }
      `,
    },
  },
};

function buildKuery(userKuery?: string): string {
  const typeKuery = `type:${AGENT_TYPE_OPAMP}`;
  const trimmed = userKuery?.trim();
  return trimmed ? `(${trimmed}) and ${typeKuery}` : typeKuery;
}

export async function listOtelCollectors(
  agentClient: AgentClient,
  options: {
    page?: number;
    perPage?: number;
    kuery?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    showInactive: boolean;
  }
): Promise<{
  items: OtelCollector[];
  total: number;
  page: number;
  perPage: number;
}> {
  const { agents, total, page, perPage } = await agentClient.listAgents({
    page: options.page,
    perPage: options.perPage,
    kuery: buildKuery(options.kuery),
    sortField: options.sortField,
    sortOrder: options.sortOrder,
    showInactive: options.showInactive,
    runtimeFields: SIGNALS_RUNTIME_FIELD,
  });

  return {
    items: agents.map(agentToOtelCollector),
    total,
    page,
    perPage,
  };
}
