# Alerting V2 workflows_extensions integration

This document explains how to register workflow triggers in `alerting_v2` using the new wrapper services.

## Architecture

- `server/lib/services/workflow_extensions_service/workflow_extensions_service.ts`
  - Wraps `WorkflowsExtensionsServerPluginSetup` and `WorkflowsExtensionsServerPluginStart`.
  - Use `registerTriggerDefinitions(...)` and `registerStepDefinitions(...)` during setup.
  - Use `emitEvent(...)` at runtime when you need to emit a trigger event.
- `public/services/workflow_extensions_service.ts`
  - Wraps `WorkflowsExtensionsPublicPluginSetup`.
  - Use `registerPublicTriggerDefinitions(...)` during public setup to register trigger UI metadata.
- `public/lib/workflow_extensions/register_trigger_definitions.ts`
  - Exports `registerTriggerDefinitions(service)`; calls `registerPublicTriggerDefinitions([...])`.

## Typical trigger setup flow

1. Define a shared trigger definition in `common` (`id` + `eventSchema`) with Zod.
2. Register it on the server in `server/lib/workflow_extensions/register_trigger_definitions.ts` via `registerTriggerDefinitions(service)`, which calls `WorkflowExtensionsService.registerTriggerDefinitions(...)`.
3. Define a public trigger definition (`PublicTriggerDefinition`) with UI metadata (title, description, icon, docs).
4. Register it on the public side in `public/lib/workflow_extensions/register_trigger_definitions.ts` via `registerTriggerDefinitions(service)`.
5. Add/update the trigger schema hash in:
   - `src/platform/plugins/shared/workflows_extensions/test/scout/api/fixtures/approved_trigger_definitions.ts`

## Server usage

`bind_on_setup.ts` calls `registerTriggerDefinitions(container.get(WorkflowExtensionsService))` from `server/lib/workflow_extensions/register_trigger_definitions.ts`.

Add your `ServerTriggerDefinition` entries to the array inside that function.

## Public usage

`public/index.ts` calls `registerTriggerDefinitions(container.get(WorkflowExtensionsService))` from `public/lib/workflow_extensions/register_trigger_definitions.ts`.

Add your `PublicTriggerDefinition` entries to the array inside that function.

## Notes

- Registration should happen in setup, not start.
- Keep server and public trigger IDs aligned.
- Public registration controls Workflows UI discoverability; server registration controls runtime validation/execution.
