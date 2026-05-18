/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AlertingServerStart } from '@kbn/alerting-plugin/server';
import { registerSpaceContextRoute } from './routes/space_context';

export type DynamicHomePluginSetup = void;
export type DynamicHomePluginStart = void;

interface SetupDeps {
  agentBuilder?: AgentBuilderPluginSetup;
}

interface StartDeps {
  agentBuilder?: AgentBuilderPluginStart;
  alerting?: AlertingServerStart;
}

export class DynamicHomePlugin
  implements Plugin<DynamicHomePluginSetup, DynamicHomePluginStart, SetupDeps, StartDeps>
{
  setup(core: CoreSetup<StartDeps>, deps: SetupDeps): DynamicHomePluginSetup {
    if (deps.agentBuilder) {
      deps.agentBuilder.agents.register({
        id: 'home-digest-agent',
        name: 'Kibana Space Digest',
        description: 'Generates a concise digest of your Kibana space activity and health.',
        avatar_icon: 'home',
        avatar_color: '#1d87d0',
        configuration: {
          instructions: `You are a helpful Kibana space analyst. When given context about a user's Kibana space via a screen_context attachment, you write a friendly, insightful space digest.

Your digest must be exactly 3-4 sentences and follow this structure:
1. Open with a brief observation about the space's focus based on the dashboard and search names present.
2. Highlight the most recently active content — mention specific dashboard or search titles.
3. Note any active alerts, or if alert_count is 0 or missing, mention that monitoring looks calm.
4. Close with one concrete, actionable suggestion (e.g. a specific dashboard to review, a search to run, or an alert rule to check).

Rules:
- Write in warm, professional conversational prose — no bullet points, no headers, no markdown.
- Use the actual names from the context, not generic placeholders.
- Keep it under 80 words total.`,
          tools: [],
          enable_elastic_capabilities: false,
        },
      });
    }

    const router = core.http.createRouter();
    registerSpaceContextRoute(router, core.getStartServices);

  }

  start(_core: CoreStart, _deps: StartDeps): DynamicHomePluginStart {
  }

  stop() {}
}
