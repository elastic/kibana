# Alerting V2 — public workflow extensions

This folder owns the **public-side (browser) registration** of `alerting_v2` workflow trigger UI metadata with the `workflows_extensions` plugin.

## Why this exists separately from the server

`workflows_extensions` exposes two contracts that need to be populated at setup time:

- **Public setup contract** (`WorkflowsExtensionsPublicPluginSetup`) — UI metadata for the Workflows builder (title, description, icon, docs, snippets). This is what controls discoverability of a trigger in the Workflows UI.
- **Server setup contract** (`WorkflowsExtensionsServerPluginSetup`) — runtime validation/execution of triggers and steps.

This README covers the **public** side. For the server side (where runtime emission also lives), see [`server/lib/services/workflow_service/README.md`](../../../server/lib/services/workflow_service/README.md).

## Registering a new trigger

Add public trigger definitions in [`register_trigger_definitions.ts`](register_trigger_definitions.ts).

The helper receives the `workflowsExtensions` setup contract and registers every trigger as a **loader** (an async `import`). The workflows app awaits `workflowsExtensions.isReady()` before rendering, so definitions are available when the UI needs them while staying out of the plugin's page-load bundle (including the lazily-imported EUI icons):

```ts
export function registerTriggerDefinitions(
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void {
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/episode_assigned').then((m) => m.episodeAssignedTriggerPublicDefinition)
  );
  // Add more trigger loaders here.
}
```

When adding a trigger:

1. Define the shared trigger (`id` + Zod `eventSchema`) in `common/`.
2. Register it on the **server** via the server-side `registerTriggerDefinitions` helper (so the runtime validates and dispatches it).
3. Add a public `PublicTriggerDefinition` module under `triggers/` and register it as a loader in this file.
4. Update the trigger schema hash fixture in `src/platform/plugins/shared/workflows_extensions/test/scout/api/fixtures/approved_trigger_definitions.ts`.
5. Keep the server and public trigger ids aligned.
