# ADR-0004 — Fallback lane shape and `continue` separation

**Status:** Accepted
**Date:** 2026-09-16
**Deciders:** @elastic/workflows-eng

## Context

### The POC's model is wrong

The POC renders fallback steps as leaves that resume at the owner step's next sibling — a flat lane that does not loop back. This does not match how the execution engine actually runs `on-failure.fallback`.

The engine compiles `on-failure.fallback` to a try/catch diamond:

```
EnterTryBlock → EnterNormalPath → [step] → ExitNormalPath
            →(error) EnterFallbackPath → [fallback steps] → ExitFallbackPath
                                                                    ↓
                                                            ExitTryBlock
```

(`fallback_step/README.md:24-28`, `build_execution_graph.ts:940`)

But the join at `ExitTryBlock` is **conditional** (`exit_try_block_node_impl.ts:22-36`): when the fallback path ran, `ExitTryBlock` re-throws and never calls `navigateToNextNode()`. So:
- `fallback` alone: the workflow **still fails** after the fallback steps run.
- `fallback` + `continue: true`: the workflow continues to the next step after `ExitTryBlock`.

This is not a rendering preference — the graph is also the execution-debugging surface (it colours traversed edges from `stepExecutions`). A visualisation that lies about execution is actively harmful.

### The `continue` write risk

"Add error handling" in the mockup implies a single action. If that action writes both `fallback` and `continue: true`, it silently converts "notify me when this fails" into "swallow this failure" — a dangerous default in a security-automation product.

## Decision

### Two shapes, not one

Spec 02 renders the fallback lane with two distinct shapes:

- **`fallback` alone → terminating diamond.** No return corridor; the join re-throws. The user _sees_ the workflow still fails.
- **`fallback` + `continue: true` → true diamond.** Rejoins the owner's next sibling. Reuses the existing `isMerge` / `buildMergeBusPath` routing that `if` already uses.

### Write `fallback` only; `continue` is a separate toggle

The graph insertion gesture writes `on-failure.fallback` only. It never writes `continue`. The terminating diamond renders the truth; the user can then enable **"Continue after fallback"** as an explicit, separate toggle in spec 07. The toggle writes `continue: true`; it can be reversed independently.

### Rename the affordance

The user-facing label "Add error handling" (from the mockup) is retired in favour of **"Add fallback steps"** in internal code. `fallback` means "on failure, also run these"; `continue` means "and then don't fail". Conflating them in one label creates the trap described above. The final user-facing label is pending design sign-off and may differ from the internal name — see [`CONTEXT.md`](../../../../../packages/shared/kbn-workflows/CONTEXT.md) for the code/copy divergence policy.

## Alternatives considered

**Render only the "flat leaf" shape (POC model).** Rejected: this is factually wrong. The execution engine does not resume at the next sibling when `continue` is absent. A reviewer running the debugger against a visualisation that shows a continuation would be misled.

**Write `fallback` + `continue: true` together in one "Add error handling" action.** Rejected: the user's intent is "run these steps on failure"; suppressing the failure is a separate, consequential decision. Making it implicit creates a security automation that silently ignores errors.

**Write `fallback` + `continue: false` together.** Rejected: `continue: false` is the schema default (when the key is absent, the behaviour is the same as `false`) and adding it explicitly adds noise without adding clarity.

## Consequences

- The fallback lane is the only graph element with two distinct rendered shapes driven by a YAML key value.
- Spec 02 must test both fixtures independently — the terminating shape and the rejoining shape — against separate expected layouts.
- Any workflow with an existing `on-failure.fallback` will suddenly render a lane after spec 02 lands (it currently renders nothing). This is a read-only graph change, but it is a visible one.
- The `ExitTryBlock` re-throw behaviour means "insert after a fallback lane" has the same dead-end problem as "insert after a block" (ADR-0001 D6): when `continue` is absent, there is no node to hang a port on. This is a known limitation recorded in [`workflow_visual_builder.md`](../workflow_visual_builder.md).
