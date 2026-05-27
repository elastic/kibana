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
import { registerSearchRoute } from './routes/search_route';

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
          instructions: `You are a helpful Kibana space analyst. When given context about a user's Kibana space via a screen_context attachment, produce a response in exactly two sections:

SECTION 1 — DIGEST (2–3 sentences, warm conversational prose, no bullet points):
- Observe the space's focus from dashboard/search names.
- Highlight the most recently active content by name.
- Note alert status — mention firing count if non-zero, or say monitoring looks calm.

Then output exactly this separator on its own line:
---

SECTION 2 — SUGGESTIONS (exactly 2 bullet points starting with "- "):
- Each is a concrete, specific action the user should take now, referencing actual data names or counts.
- Max 12 words each.

Keep everything under 120 words total. Use actual names/numbers from the context, not placeholders.`,
          tools: [],
          enable_elastic_capabilities: false,
        },
      });
    }

    const router = core.http.createRouter();
    registerSpaceContextRoute(router, core.getStartServices);
    registerSearchRoute(router);
  }

  start(_core: CoreStart, _deps: StartDeps): DynamicHomePluginStart {}

  stop() {}
}
