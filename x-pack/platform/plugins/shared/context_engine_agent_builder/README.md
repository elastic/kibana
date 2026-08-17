# Context Engine <> Agent Builder integration

Bridge plugin that wires Context Engine into Agent Builder. It exists so that
neither `contextEngine` nor `agentBuilder` needs a direct compile-time dependency
on the other, avoiding a dependency cycle.

It registers:

- the `platform.context_engine.ai_index` attachment type
- the `platform.context_engine.save_automation` tool, scoped to conversations
  that have an `ai_index` attachment

Because it only performs server-side registration, this plugin is `browser: false`.
