# [Agent Builder] Implement Hooks RFC — PR #251835

## Summary

This PR implements the **Hooks RFC** for the Agent Builder plugin. It introduces a lifecycle hooks API that allows other plugins to register callbacks at key points during agent execution: before/after each conversation round and before/after each tool call. Hooks can be **blocking** (await execution, can mutate context, errors abort the run) or **non-blocking** (fire-and-forget, errors are logged only). Execution order is controlled by an optional `priority`; `before*` hooks run in order, `after*` hooks run in reverse order.

No visual changes. Documentation is added in the plugin README.

---

## What are the changes?

### New packages / plugin API

- **`@kbn/agent-builder-common`**
  - New `hooks/lifecycle.ts`: `HookLifecycle` enum (`beforeConversationRound`, `afterConversationRound`, `beforeToolCall`, `afterToolCall`) and `HookExecutionMode` enum (`blocking`, `nonBlocking`).
  - New error type `AgentBuilderHooksExecutionError` and helpers `createHooksExecutionError`, `isHooksExecutionError` in `base/errors.ts`.

- **`@kbn/agent-builder-server`**
  - New `hooks/types.ts`: Hook context types per lifecycle, handler result types, `HooksServiceSetup` (`register(bundle)`), `HooksServiceStart` (`run(lifecycle, context)`).
  - New `hooks/apply_result.ts`: Helpers to apply hook return values to context per lifecycle.
  - `AgentHandlerContext` and `RunContext` gain optional `hooks` and `abortSignal`; runner passes them through so hooks can run and respect cancellation.

- **Agent Builder plugin**
  - Setup contract: `agentBuilder.hooks.register(bundle)`.
  - New **HooksService** (setup/start): stores registrations, implements `run()` (blocking first, then non-blocking with updated context).
  - **Chat service**: runs `beforeConversationRound` before building context and `afterConversationRound` on round-complete events (with context mutation).
  - **Runner / run_tool**: runs `beforeToolCall` before and `afterToolCall` after each tool execution; mutates `toolParams` and `toolReturn` from hook results.


---

## How to test the PR


### Manual testing with the example hooks
Register a hook in any plugin setup phase.


Minimal registration shape (see README for full example):

```ts
agentBuilder.hooks.register({
  id: 'my-plugin-hooks',
  priority: 10, // optional
  hooks: {
    [HookLifecycle.beforeToolCall]: {
      mode: HookExecutionMode.blocking,
      handler: async (context) => {
        // context.toolParams, context.toolId, context.request, etc.
        return { toolParams: { ...context.toolParams, _tag: 'my-plugin' } };
      },
    },
    [HookLifecycle.afterConversationRound]: {
      mode: HookExecutionMode.nonBlocking,
      handler: async (context) => {
        // context.round, context.conversation, context.request
        await myAuditService.log(context);
      },
    },
  },
});
```

1. Start Kibana with the Agent Builder / chat flow enabled (e.g. open an agent that uses tools).
2. Send a message that triggers at least one tool call.
3. Confirm the hook were called by inspecting tool params/results in logs

