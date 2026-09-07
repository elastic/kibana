# Conversation proposals

Solution-agnostic storage, API and workflow steps for **proposals**: recommendations a system surfaces to a human, optionally carrying an executable **action**.

Consumed by AlertZero (Security) and intended for Nightshift (Observability). Nothing in this plugin is solution-specific.

## Model

- A **proposal** is a recommendation awaiting a human decision. It lives in `.kibana-conversation-proposals` and points at the conversation it belongs to.
- An **action proposal** additionally references a managed **action workflow** (`actionWorkflowId`) plus its `actionInput`. Approving it runs that workflow.
- A **non-action proposal** carries only a `comment` — instructions the analyst carries out themselves before approving.
- Proposals are immutable once decided, and are never tuned: changing an action means dismissing and creating a new proposal, optionally linked through `supersedesProposalId`.

## Where things are

| What | Path |
| --- | --- |
| Schemas and constants shared with consumers | `common/` |
| Index mappings | `server/storage/proposals_storage.ts` |
| The only writer of the index | `server/services/proposals_service.ts` |
| Internal HTTP API | `server/routes/register_routes.ts` |
| Workflow step definitions (`proposals.create`, `proposals.recordResult`) | `common/step_types/`, `server/step_types/`, `public/step_types/` |
| The generic gate workflow | `@kbn/workflows/managed` → `definitions/conversation_proposals/` |

## API

All routes are internal and versioned (`/internal/proposals`, version `1`):

- `POST /internal/proposals` — create
- `GET /internal/proposals` — list (filter by `status`, `conversationId`, `targetEntity`)
- `GET /internal/proposals/{id}` — read one, with action metadata resolved
- `POST /internal/proposals/{id}/approve` — approve, then release the gate
- `POST /internal/proposals/{id}/dismiss` — dismiss with a structured reason

Reads need `proposals_read`; both decisions need `proposals_write`. There is deliberately **no update route** — `status` is a consequence of deciding and executing, never something a caller sets.

## Invariants worth preserving

- **The decision is written before the workflow is resumed.** The gate only ever receives a boolean, so the record is the durable channel for what was decided.
- **The gate step is resolved explicitly.** The platform's waiting-step lookup only matches `waitForInput`; for a `waitForApproval` gate it returns nothing and would resume *without* claiming the step or stamping the audit envelope. `resumeGate` finds the step itself and passes `stepExecutionId`.
- **The decision actor is server-derived.** Never accepted from a request body.
- **Approval carries the action input the approver was shown**, so an approval that no longer matches the record is refused with a conflict.
- **Action metadata is resolved on read** from the action workflow's `consts.actionMetadata`, never copied onto the proposal, so a catalog change is picked up rather than going stale.

## Authoring an action workflow

An action workflow is an ordinary managed workflow that:

1. carries the `action` tag, so the catalog can be discovered by tag;
2. declares `consts.actionMetadata` (`name`, `category`, and optionally `description`, `impact`, `reversible`, `approvalPolicy`) — metadata has to live under `consts`, because unknown top-level YAML keys are stripped by the workflow schema;
3. takes a **single `actionInput` object** as its input, so the generic gate workflow never needs to know an action's parameter names;
4. ends in `workflow.output`, because `workflow.execute` cannot type a child's result.

See `definitions/pnd/action_create_rule.yaml` for a worked example.

## Index name

`.kibana-conversation-proposals` is a deliberate proof-of-concept name: `.kibana*` is already granted to the `kibana_system` role, so it needs no Elasticsearch-side system index registration. The intended final name (`.conversation-proposals`) does, and that is follow-up work.
