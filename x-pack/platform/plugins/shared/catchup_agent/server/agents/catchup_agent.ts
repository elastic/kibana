/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';

export const catchupAgentDefinition = (): BuiltInAgentDefinition => {
  return {
    id: 'platform.catchup.agent',
    name: 'Elastic CatchUp Agent',
    description:
      'Provides context-rich summaries of Elastic Security and external system activity (Slack, GitHub, Gmail) since a given timestamp. Helps users catch up on security updates, cases, rules, and related external communications while they were away.',
    configuration: {
      tools: [
        {
          tool_ids: [
            // Individual security tools (for specific queries)
            'platform.catchup.security.attack_discoveries',
            'platform.catchup.security.detections',
            'platform.catchup.security.cases',
            'platform.catchup.security.rule_changes',
            // Security summary tool (for general catch-up queries)
            'platform.catchup.security.summary',
            // 'platform.catchup.observability.summary', // Temporarily disabled
            // 'platform.catchup.search.summary', // Temporarily disabled
            'platform.catchup.external.slack',
            'platform.catchup.external.github',
            'platform.catchup.external.gmail',
            'platform.catchup.correlation.engine',
            'platform.catchup.summary.generator',
          ],
        },
      ],
    },
  };
};
