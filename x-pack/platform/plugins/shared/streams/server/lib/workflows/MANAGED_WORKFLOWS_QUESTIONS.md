# KI Managed Workflows — Feedback for the Workflow Team

These findings arose during integration of the Streams KI workflows as managed system workflows (PR #267952).

---

## Bugs

### B1: Child workflow resolution does not include global workflows

**Current behavior**: When a workflow installed globally (`spaceId: '*'`) executes a child workflow via `workflow.execute` / `workflow.executeAsync`, the engine resolves the child by `(workflowId, currentSpaceId)`. If the child is also global, it is not found because the lookup does not include `spaceId: '*'`.

**Error**: `Workflow not found: "system-streams-ki-features-identification" (referenced by step "identify_features" in workflow "system-streams-ki-onboarding")`

**Desired behavior**: `workflowRepository.getWorkflow` in `workflow_execute_step_impl.ts` should pass `includeGlobal: true` so child workflows installed globally can be found from any execution space.

### B2: Cross-space concurrency not enforced for global workflows

**Current behavior**: For global workflows, `getRunningExecutionsByConcurrencyGroup` filters by `spaceId`. A workflow with `concurrency.key: "streams-ki-onboarding-mystream"` and `strategy: drop, max: 1` can be triggered simultaneously from two different spaces because each space's filter only sees its own executions.

**Desired behavior**: When a workflow is global (`spaceId: '*'`), concurrency checks should evaluate across all spaces. The concurrency group key already encodes the uniqueness scope; space filtering causes global workflows to exceed their concurrency limit.

**Additional consequence**: Executions of global workflows are stored with the triggering space's `spaceId`, which also means you cannot see or cancel an execution from a different space than where it was triggered.

**Suggested long-term design**: Executions of global workflows should themselves be stored with `spaceId: '*'` and a separate field (e.g., `triggeredFromSpace`) to track origin. This would make concurrency, visibility, and querying consistent without per-call-site opt-ins.

### B3: Cannot disable global workflows from UI

**Current behavior**: Attempting to disable a global workflow (`spaceId: '*'`) from the Workflows UI returns:

> "Workflow with id system-streams-ki-features-identification not found in space default"

The management API's update/disable endpoint resolves by `(workflowId, spaceId)` and does not include global workflows. This means:
- Users cannot toggle managed workflows from the UI.

**Desired behavior**: The management API should resolve global workflows when updating/disabling, similar to how `getWorkflowDocumentSource` accepts `includeGlobal: true`.

### B4: `PluginScopedManagedWorkflowsApi.execute` defaults `spaceId` to `'*'`

**Current behavior**: When `options.spaceId` is omitted in `PluginScopedManagedWorkflowsApi.execute(request, id, options)`, the service defaults to `GLOBAL_WORKFLOW_SPACE_ID` (`'*'`). The execution document is created (you get back an execution ID) but the workflow never starts — the execution engine expects a real space ID.

**Desired behavior**: Either:
- Default to the requesting user's space (extracted from the request, which is already a parameter).
- Or make `spaceId` a required field and error if omitted.

The silent failure makes this very easy to miss.

---

## DX Issues

### D1: Managed client API gap — status/cancel missing

The managed API exposes `install`/`uninstall`/`execute` but not `getWorkflowExecutions`/`cancelWorkflowExecution`. Consumers must mix managed + management APIs for the full workflow lifecycle.

**Ask**: Add `getExecutions` and `cancelExecution` to `PluginScopedManagedWorkflowsApi`, or document the expected pattern.

### D2: N+1 enrichment — `concurrencyGroupKey` missing from list items

`getWorkflowExecutions` strips `concurrencyGroupKey` from list results even though it is stored in ES. We need it to identify which stream an execution belongs to, forcing a per-item `getWorkflowExecution` call.

**Ask**: Include `concurrencyGroupKey` in `WorkflowExecutionListItemDto`.

### D3: Client-side pagination & filtering

Without server-side filters for `concurrencyGroupKey` and `finishedAfter`/`finishedBefore`, we paginate through all completed executions and filter in a loop — doesn't scale when a workflow has thousands of executions across concurrency groups.

**Ask**: Add `concurrencyGroupKey`, `finishedAfter`, and `finishedBefore` as filter parameters on `getWorkflowExecutions` (all are already indexed ES fields).

### D4: Sort order control

`getWorkflowExecutions` always sorts by `createdAt desc`. The underlying `searchWorkflowExecutions` already accepts a `sort` parameter but it's not exposed. We need `finishedAt` sorting for correct "most recent completion" lookups — `createdAt` order doesn't guarantee `finishedAt` order.

**Ask**: Expose the existing `sort` parameter through `getWorkflowExecutions`.