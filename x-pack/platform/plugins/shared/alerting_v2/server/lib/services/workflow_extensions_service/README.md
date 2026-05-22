# Alerting V2 server

This README explains how `alerting_v2` integrates with `workflows_extensions` on the server:

- Registering workflow triggers during setup.
- Emitting workflow trigger events at request time.

For public trigger UI metadata, see [`public/lib/workflow_extensions/README.md`](../../../../public/lib/workflow_extensions/README.md).

## Registering a new trigger

Add server-side trigger definitions in [`server/lib/workflow_extensions/register_trigger_definitions.ts`](../../workflow_extensions/register_trigger_definitions.ts).

The helper receives the `workflowsExtensions` setup contract and registers every `ServerTriggerDefinition`:

```ts
export function registerTriggerDefinitions(
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void {
  const triggerDefinitions: ServerTriggerDefinition[] = [
    // Add trigger definitions here.
  ];

  for (const definition of triggerDefinitions) {
    workflowsExtensions.registerTriggerDefinition(definition);
  }
}
```

This helper is called from [`server/setup/bind_on_setup.ts`](../../../setup/bind_on_setup.ts) inside the `OnSetup` callback, so registration happens during plugin setup.

When adding a trigger:

1. Define the shared trigger id and event schema in `common/`.
2. Add the server `ServerTriggerDefinition` to `register_trigger_definitions.ts`.
3. Add the matching public `PublicTriggerDefinition` so the trigger appears in the Workflows UI.
4. Keep the server and public trigger ids aligned.

## Emitting an event

Runtime code should emit events through `WorkflowExtensionsService`.

Inject `WorkflowExtensionsServiceToken` into a request-scoped service or consumer:

```ts
@injectable()
class SomeRequestScopedConsumer {
  constructor(
    @inject(WorkflowExtensionsServiceToken)
    private readonly workflowExtensions: WorkflowExtensionsServiceContract
  ) {}

  async run() {
    await this.workflowExtensions.emitEvent('alerting_v2.some-trigger', { ruleId: '…' });
  }
}
```

The service exposes a single method:

```ts
emitEvent(triggerId: string, payload: Record<string, unknown>): Promise<void>
```

The service uses a request-scoped `WorkflowsClient`, so emitted events include the current request auth context.
