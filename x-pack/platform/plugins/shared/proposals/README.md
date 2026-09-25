# Proposals

A **proposal** is a recommendation an agent makes and a human decides. This plugin owns the record, its API, and its workflow steps, so a Worker in any solution can create one and any solution's UI can act on it.

Consumed by AlertZero (Security) and intended for Nightshift (Observability). Nothing here is solution-specific: the plugin depends on Agent Builder and Workflows, and on nothing above them.

## What belongs here, and what does not

This plugin owns the record, the decision, and the guarantee that an approved action runs **as the approver**. It does not decide what to propose, when to propose it, or whether autonomy allows skipping the human gate — a Worker does all three.

## Layout

```
@kbn/proposals-common     constants, schemas, step schemas and ids — the shared contract
@kbn/proposals-ui         the approval card's primitives, consumed by this plugin and by
                          @kbn/agentic-investigations-common's investigation flyout
server/
  plugin.ts config.ts types.ts constants.ts features.ts
  routes/ services/ storage/ step_types/ attachments/ managed_workflows/
public/
  plugin.ts index.ts types.ts
  hooks/ components/ attachments/ step_types/
```

The contract is a package rather than a `common/` directory because `@kbn/proposals-ui` needs the
proposal types too, and a package cannot import from a plugin without closing a project-reference
cycle.

## Privileges

One Kibana feature, `proposals`, shown in the Roles and Spaces pickers as **Proposed Actions**. Both privileges are declared inline on the feature:

| Feature privilege | API | UI |
| ----------------- | ------------------------------------ | ------------------------------------ |
| `all`             | `read_proposals`, `manage_proposals` | `showProposals`, `decideProposals`   |
| `read`            | `read_proposals`                     | `showProposals`                      |

So `read` can see the queue but cannot decide it. The feature carries `minimumLicense: 'enterprise'`.

### Three questions, three places

Conflating these is how proposal authorization goes wrong, so each is enforced somewhere different.

| Question | Principal | Enforced by | On refusal |
| --- | --- | --- | --- |
| May this HTTP caller decide? | The request | `requiredPrivileges` on the route | Synchronous `403` — the only place a human can be told |
| May this resumer decide *this* proposal? | The approver, which post-gate is the execution identity | `proposals.checkDecidePrivileges`, **after the gate and before any write** | Returns `false`; the gate workflow re-parks for someone who can |
| May this execution write proposals at all? | The Worker running the step | An assert **inside each writing step** | Fails the step; a Worker without the privilege is a misconfiguration, not something to retry |

**Ordering is load-bearing.** The boolean check must precede every write inside the decision loop. If a write came first and failed instead, the gate would already be claimed and spent, the workflow would fail, and the proposal would strand with no way for a privileged approver to retry.

All checks **fail closed**, including when the `security` plugin is absent entirely: without it there is no principal to evaluate, and a workflow that cannot be attributed must not write. Workflows cannot execute steps without an identity, so an absent principal is a bug rather than a normal path.

**Not in the service.** The service is reached from routes (already gated declaratively), from steps (principal is an execution), and from other plugins through the start contract — in-process and trusted, which is how AlertZero's `ConversationProposalsService` calls `list`. Request-based authz there would mean threading a request through every call and standing up a second mechanism beside the routes'. The service stays the invariant layer instead: terminal guards, decision immutability, valid-pair enforcement, action-input validation.

**The principal differs by surface, and one of them cannot be checked.** An authenticated resume runs the post-gate steps under a clone of the resumer's API key, so the check evaluates the human. An **external-token resume carries no request**, so the engine wakes the pre-scheduled task under the *workflow runner's* key instead — and that identity necessarily holds `manage_proposals`, because it had to in order to create the proposal. Checking it would therefore authorize every click on a magic link, as the Worker, and record the Worker as the decider.

`hitlExternalResume.enabled` defaults to `true` and `external_resume_service.ts` handles `waitForApproval` explicitly, so this is reachable rather than theoretical. `proposals.checkDecidePrivileges` therefore takes the gate's own `respondedBy` and refuses any principal prefixed `external_resume:` outright, without consulting the privilege service — there is nothing it could usefully ask. The loop re-parks, so an authenticated approver can still decide. Enabling external channels for proposal gates needs the platform to propagate the responder's identity, not just their answer.

## Proposals

### Model

- A **proposal** is a recommendation awaiting a human decision. It lives in `.kibana-proposals` and points at the conversation it belongs to.
- An **action proposal** additionally references a managed **action workflow** (`actionWorkflowId`) plus its `actionInput`. Approving it runs that workflow.
- A **non-action proposal** carries only its `comment` — instructions the analyst carries out themselves before approving. It is always gated: autonomy governs whether an action may run unattended, and there is no action here to govern, so `autoApprove` is ignored.
- Proposals are immutable once **decided**. An undecided proposal can still be **revised**: `revise()` supersedes the current head with a new revision that carries the correction, and the gate decides whichever revision is live when the analyst answers. The predecessor is marked `superseded` and hidden from the queue by `excludeSuperseded`, so a chain shows one live row at a time.

### Decision and status are two axes

`decision` records what a human concluded; `status` records where the proposal got to. They are separate fields because they answer different questions and settle at different times.

- **`decision: approved | dismissed`** — absent until someone decides, and immutable once set. Groups with `decidedBy` / `decidedAt` / `rationale` / `dismissReason`.
- **`status: pending | executing | succeeded | failed | expired | no_action`** — always defined.

The split exists because a single field could not express both: `status` has to say whether an approved action succeeded, and `decision` has to survive that outcome so the queue knows a human already answered.

Because `pending` is only ever valid while undecided, the two axes give you two distinct reads rather than one:

- **`status: 'pending'`** — undecided *and not yet settled*: "awaiting a human right now". This is what a decision queue filters on.
- **`decision` does not exist** — `status ∈ {pending, expired}`: "no human ever answered", including deadlines that passed unanswered.

Nothing needs the second today, so only the first is exposed as a filter.

Two of the statuses exist to stop other values doing double duty:

- **`expired`** means nobody answered in time, so `dismissed` no longer has to cover both "a human declined" and "the deadline passed".
- **`no_action`** means a human answered and nothing will execute: a dismissal of any kind, or an approval of a proposal carrying no action. It reads as "no action was executed" under both. Without it, both cases would sit at `pending` forever, indistinguishable from awaiting.

The only valid combinations, enforced by `ProposalsService.update`:

| `decision` | `status` | Meaning |
| --- | --- | --- |
| absent | `pending` | Awaiting a human |
| absent | `expired` | The deadline passed unanswered |
| `dismissed` | `no_action` | Declined |
| `approved` | `no_action` | Accepted, but there is nothing to run |
| `approved` | `executing` | The action is running |
| `approved` | `succeeded` / `failed` | The action's outcome |

Note the consequence for an undecided proposal: `expired` is its *only* terminal status, since every execution state requires an approval. A malfunction before anyone decided therefore settles as "no decision was reached" rather than as a failure.

Two independent guards replace what used to be one terminal check: a status cannot *change* once it is `succeeded | failed | expired | no_action`, and a `decision` cannot be overwritten once set. They are independent because the axes settle independently — the decision guard is what refuses a second approver on a proposal that is still `pending` behind the gate.

Re-writing the *same* terminal status is deliberately allowed, so settling stays idempotent. The workflow's failure handler records `failed` on a record the loop may have already failed — if the clone step throws after `record_action_failure` succeeded, say — and refusing that would replace the real error with a conflict about recording it.

**`expired` is persisted but expiry is also computed.** Between the deadline passing and the loop settling the record there is task lag during which it still reads `pending`. The computed `expired` flag on the read model is for the UI; persisted `status: expired` is the durable settlement.

`supersededBy` points at the proposal that replaced this one — written when a failed action is re-offered as a fresh proposal. The queue filters superseded records out so a chain of retries appears once rather than per attempt.

### The revision chain

A proposal that is still undecided can be corrected rather than dismissed and
re-offered. `revise()` writes a new revision, points the predecessor at it with
`supersededBy`, and marks that predecessor `superseded`; both rows carry the same
`rootProposalId`, so the chain is one query rather than a pointer walk. Only the
head is live: `excludeSuperseded` hides the rest from the queue, and `revise()`
refuses a proposal that is already superseded, decided, or expired, so a chain
cannot fork and cannot be extended past its deadline.

The gate does not re-park on a revision. It stays parked on the *original*
execution, and the decision is applied to whichever revision is live when the
analyst answers — `proposals.getLatestRevision`, called after the resumer is
authorized and before any write, resolves the carried id to the chain head. An
approval therefore carries the `actionInput` of the revision the approver was
shown, not the one the Worker first proposed.

Chains predating this field have `rootProposalId` on neither row; the term query
misses and the fallback returns the row asked about, which is the correct answer
for a chain of one. The plugin is unshipped, so there is nothing to migrate.

### Architecture

```mermaid
flowchart TB
    subgraph solution["Solution plugin (e.g. alertzero)"]
        worker["Worker workflow"]
        ui["Pending-proposals UI"]
    end

    subgraph proposals["proposals (this plugin)"]
        steps["proposals.createProposal<br/>proposals.updateProposal<br/>proposals.settleIncompleteProposal<br/>proposals.checkDecidePrivileges<br/>proposals.getProposal<br/>proposals.cloneProposal"]
        api["Internal HTTP API<br/>/internal/proposals"]
        service["ProposalsService<br/><i>the only writer</i>"]
        gate["system-create-proposal<br/><i>managed gate workflow</i>"]
    end

    subgraph platform["Workflows platform"]
        engine["Workflow engine"]
        agent["Agent<br/><i>ai.agent step</i>"]
        catalog["Action workflow catalog<br/><i>tagged `action`</i>"]
    end

    index[(".kibana-proposals")]

    worker -->|"ai.agent"| agent
    agent -->|"reads the catalog<br/>to pick an action"| catalog
    agent -->|"structured output"| worker
    worker -->|"workflow.execute"| gate
    gate --> steps
    steps --> service
    ui -->|"read / approve / dismiss"| api
    api --> service
    service --> index
    api -->|"release the gate"| engine
    service -->|"reads consts.actionMetadata"| catalog
    gate -->|"workflow.execute"| catalog
```

Three boundaries are worth stating outright. `ProposalsService` is the **only** writer of the index — the steps and the routes both go through it, and there is no second path. The solution plugin owns no storage: it contributes a Worker and a UI, and reaches the record only through the HTTP API. And **the gate workflow is the only writer of a decision**: the routes release the gate, and the steps behind it record what was decided.

That last one is the point of the design. Every resume surface — this API, the platform's own resume route, the Inbox, Agent Builder — funnels through the same parked gate, so a check and a write placed behind it cover all of them at once. Writing the decision in the approve route instead would mean only that one route ever recorded it.

The Agent is where the action is chosen. A Worker spawns it with an `ai.agent` step; the agent reads the action catalog to see which actions exist and what each one takes, then returns structured output naming an `actionWorkflowId` and its `actionInput`. Neither this plugin nor the gate workflow decides which action is appropriate.

### Lifecycle

```mermaid
sequenceDiagram
    participant W as Worker workflow
    participant G as Gate workflow
    participant S as ProposalsService
    participant I as Index
    participant A as Analyst
    participant AW as Action workflow

    W->>G: workflow.execute(conversationId, actionWorkflowId, actionInput)
    G->>S: proposals.createProposal
    S->>I: pending proposal (+ this execution id)
    S-->>G: proposalId, expiresAt
    G->>G: waitForApproval — parked

    A->>S: POST /approve
    Note over S,I: Writes nothing but the rationale.<br/>Nothing durable, so nothing to roll back.
    S->>G: resume(approved: true), as the analyst

    G->>S: proposals.checkDecidePrivileges
    Note over G,S: Before any read or write. A denial re-parks<br/>rather than spending the gate.
    G->>S: proposals.getLatestRevision
    Note over G,S: A revision may have landed during the park,<br/>so the decision settles the chain's live head.
    G->>S: proposals.updateProposal(approved + executing)
    S->>I: decision=approved, decidedBy=<analyst>
    G->>AW: workflow.execute(actionInput)
    Note over AW: Runs under the analyst's API key,<br/>so the result is attributed to them.
    AW-->>G: output
    G->>S: proposals.updateProposal(succeeded)
```

Dismissal follows the same shape down the gate's negative branch, so no action runs, and settles at `dismissed` + `no_action`.

**The decision is asynchronous.** The resume call returns before the post-gate steps run, so the route's response body still describes an undecided proposal. Callers must invalidate and refetch rather than trust it — `useApproveProposal` and `useDismissProposal` both do.

### The decision loop

The gate sits inside a `while` loop, because releasing a gate is not the same thing as deciding. Two cases need the proposal parked again rather than settled: a resumer who cannot decide, and an action that failed and is worth re-offering. Each iteration:

1. **Park on the gate** for whatever is left of the deadline, under a step-level `on-failure: continue` so a timeout stays inside the loop instead of reaching the workflow-level handler — which is what makes an unanswered proposal end the run as `completed` with an output, instead of `failed`. The remaining time is computed here, in the only branch that needs it; the autonomy path never waits. The key is honoured by the engine but unmodelled by `WaitForApprovalStepSchema` — see "Known limitations" and [#19315](https://github.com/elastic/security-team/issues/19315).
2. **Copy the gate outcome into variables immediately**, inside the iteration that produced it — `waitForApproval` is not exempt from output eviction, and a step output resolves to its latest execution, so a later iteration that skipped the gate would read this pass's values. Whether the gate timed out travels the same way, because the branch that handles it runs past the point where `steps.await_decision` is still readable.
3. **Check the resumer's privilege**, and `loop.continue` when denied. Nothing has been written at this point. Skipped unless someone actually answered: the autonomy path has no resumer, and neither does a gate that timed out.
4. **Adopt the chain's live head**, once. Everything below writes, a revision appended during the park would have superseded the carried id, and `updateProposal` refuses a superseded row. Placement is the whole invariant — after the privilege check so a denied resumer re-parks before this reads the chain, and before every branch that writes.
5. **Settle `expired` if the gate timed out.** This is the only expiry path inside the loop — budget exhaustion settles the same way after the loop exits. A proposal that reaches the gate already past its deadline — a cloned retry after a long action — parks for a second (`at_least: 1`) and times out into the same branch. It comes before the dismissal branch, because a timed-out gate answers blank and that branch would otherwise record a decision nobody made.
6. **Record the decision**, together with the status it implies — never on its own, because `approved` + `pending` is not a legal pair, and a decision-only write would leave the record claiming an approval with no outcome.
7. On an action failure, **clone** the proposal, adopt the new id, and loop; the clone inherits the deadline so a chain of retries cannot outlive it. Cloning a proposal that already carries `supersededBy` is refused, because overwriting the pointer would orphan the first clone.

The chain is read explicitly once in the loop (step 4). Incomplete settles — gate expiry, attempt-budget exhaustion, and the workflow-level failure handler — adopt inside `proposals.settleIncompleteProposal` instead, because a workflow-level fallback cannot reference its own step outputs by YAML name.

Three invariants the loop depends on:

- **`max-iterations` exits into `settle_unfinished`.** A `while` is in `flowControlStepTypes`, which `handleWorkflowLevelOnFailure` skips, so the error `on-limit: fail` throws would reach no handler at all — hence `on-limit: continue`, which leaves the loop for a post-loop settle that records `expired`. The deadline is still what normally settles: every park is bounded by the time left on it, so the expiry check is reached on the first iteration after it passes. The iteration limit is a runaway guard — see "Known limitations".
- **No `iteration-timeout`.** It wraps the loop body in a step-timeout zone, which would cut the parked gate short.
- **Never read a loop-body step output after the loop.** Those are evicted on exit. `data.set` variables survive both the loop and a HITL park, which is why everything the loop carries lives in one.

Conditions use a single `and` or a single comparison throughout. Liquid has no operator precedence and no parentheses, so a mixed `and`/`or` expression binds in a way that does not match how it reads.

### Custom steps

| Step | Privilege | On refusal |
| --- | --- | --- |
| `proposals.createProposal` | manage | Fails the step |
| `proposals.updateProposal` | manage | Fails the step |
| `proposals.settleIncompleteProposal` | none | — |
| `proposals.getProposal` | read | Fails the step |
| `proposals.cloneProposal` | manage | Fails the step |
| `proposals.checkDecidePrivileges` | manage | **Returns `false`** |

`settleIncompleteProposal` deliberately skips `manage_proposals`: gate expiry, attempt-budget exhaustion, and the workflow-level fallback may run under a denied resumer's API key, and `updateProposal` would fail the settle. It adopts the live head, then writes `failed` or `expired` (explicit status, or discriminated from whether the record already has a decision).

Each failure mode gets its own `ExecutionError.type` (`PermissionError`, `ConflictError`, `ExpiredError`, `NotFoundError`, `ValidationError`, `ApiError`), because the type is the only part of an error a workflow can branch on — `ExecutionError` carries just `{ type, message, details? }`, and all three timeout sources already share `TimeoutError`.

`checkDecidePrivileges` is the one step that does not fail on a denial, but it *does* fail on an unexpected error: a privilege service that is down is not a refusal, and a loop that treated it as one would re-park forever.

### How a Worker creates a proposal

Call the gate workflow; do not write proposals directly.

```yaml
- name: propose_action
  type: workflow.execute
  with:
    workflow-id: system-create-proposal
    inputs:
      conversationId: '{{ steps.investigate.output.conversation_id }}'
      comment: 'Tune the noisy rule that produced this alert'
      actionWorkflowId: '{{ steps.suggest_action.output.structured_output.actionWorkflowId }}'
      actionInput: '${{ steps.suggest_action.output.structured_output.actionInput }}'
      impact: low
      confidence: medium
```

The input contract:

| Input | Required | Notes |
| --- | --- | --- |
| `conversationId` | yes | The conversation the proposal belongs to. |
| `comment` | yes | Markdown explaining what is being proposed. A proposal a human cannot read is not reviewable. |
| `actionWorkflowId` | no | Omit for a proposal the analyst carries out themselves. |
| `actionInput` | no | Passed to the action workflow as its single `actionInput` object. |
| `impact`, `confidence` | no | Snapshotted at creation; used for queue ordering. `impact` overrides the action's own. |
| `category` | no | Overrides the action's own. Pass it for a proposal with no action, or it cannot be grouped and consumers will drop it. |
| `expiresIn` | no | How long the analyst has to decide, as a duration like `4h` or `1w2d`. Defaults to `72h`. The gate parks against whatever this resolves to. |
| `autoApprove` | no | See below. Defaults to `false`, so the gate is fail-closed. |

You get back `proposalId` and `status`.

**The decision deadline defaults to 72h and the caller may override it.** `expiresIn` is a workflow input; `create_proposal` renders it as `{{ inputs.expiresIn | default: '72h' }}`, and that is the only deadline in the definition. The gate derives every park from the `expiresAt` it resolves to — `timeout: '{{ variables.remaining_seconds }}s'`, rendered once at wait-entry and frozen on step state as `dynamicTimeout` ([#291744](https://github.com/elastic/kibana/pull/291744)) — so the queue and the parked gate cannot disagree about when a decision expires, and a proposal expires on its deadline however many times its gate re-parks. A gate that times out has therefore reached the deadline by construction, which is why the loop settles it as `expired` outright.

**`expiresIn` is deliberately unbounded, and `settings.timeout` is a sentinel.** The workflow wants no ceiling at all: every path is already bounded — the gate by the remaining deadline, the action by its own workflow timeout, the loop by `max-iterations` — so a ceiling adds no safety and one failure mode, since it runs no handler and strands the record as `pending`. The engine has no way to express "no timeout" (omitting it applies `DEFAULT_WORKFLOW_TIMEOUT`, 6h, which would cut every parked gate short), so it is set to `52w`. Do not tighten it to fit a particular deadline, and do not bound `expiresIn` to fit it: a ceiling that can fire before the gate settles is strictly worse than no ceiling. A caller asking for a deadline beyond a year is the one case this does not cover.

**`autoApprove` is for callers that already resolved autonomy.** This plugin has no autonomy policy of its own; a Worker that has decided the action is permitted without a human passes `autoApprove: true`. Anything else leaves it unset.

The flag is a request, not a guarantee. The gate skips the human decision only when all three of these hold, and parks on a human otherwise:

1. `autoApprove` is `true`;
2. `actionWorkflowId` is set — autonomy governs whether an *action* may run unattended, and a proposal with no action has none to govern, so it is always gated regardless of the flag;
3. the action does not declare `approvalPolicy: always-gate`.

An action declaring `always-gate` therefore overrides any autonomy the caller resolved: a Worker cannot auto-approve it by mistake, and the action's own declaration is what enforces that rather than the caller's good behaviour. When the gate is skipped the proposal is still recorded, and the action still runs.

**The calling workflow must itself be managed.** An unmanaged parent can neither execute a managed child nor see globally-installed definitions, so a Worker registered outside `@kbn/workflows/managed` cannot reach the gate.

Omitting an optional input is safe. A Liquid template for an absent input still renders — as `''` — so every optional step input is declared with `optionalStepInput`, which treats `''` and `null` as absent. Without it, `actionInput: '${{ inputs.actionInput }}'` on a non-action proposal would fail schema validation before the handler ran.

### Authoring an action workflow

An action workflow is an ordinary managed workflow that:

1. carries the `action` tag, so the catalog can be discovered by tag;
2. declares `consts.actionMetadata` (`name`, `category` — any keyword the owning solution chooses — and optionally `description`, `impact`, `reversible`, `approvalPolicy`) — metadata has to live under `consts`, because unknown top-level YAML keys are stripped by the workflow schema;
3. takes a **single `actionInput` object** as its input, so the generic gate workflow never needs to know an action's parameter names;
4. ends in `workflow.output`, because `workflow.execute` cannot type a child's result.

Rule 3 is the non-obvious one and the easiest to get wrong: the gate passes exactly one key, `actionInput`. An action that declares `name`, `query` and `index` as top-level inputs will receive none of them. Declare them as properties of `actionInput` instead, and mark the ones that define the action's scope `required` — a default that matches everything is a demo shortcut, not a catalog entry.

See `definitions/alertzero/actions/action_create_detection_rule.yaml` for a worked example.

### API

All routes are internal and versioned (`/internal/proposals`, version `1`):

- `GET /internal/proposals` — list (filter by `status`, `decision`, `conversationId`, `excludeSuperseded`, `excludeExpired`; paged with `from` and `size`)
- `GET /internal/proposals/{id}` — read one, with action metadata resolved
- `POST /internal/proposals/{id}/approve` — release the gate positively
- `POST /internal/proposals/{id}/dismiss` — annotate the reason, then release the gate negatively
- `POST /internal/proposals/{proposalId}/revisions` — supersede the current head with a corrected revision, which becomes the proposal the gate decides
- `GET /internal/proposals/charts-summary` — aggregate counts for the queue's charts

Reads and the chart summary need `read_proposals`; both decisions and a revision need `manage_proposals`.

Two routes are deliberately absent. There is **no update route**: `status` is a consequence of deciding and executing, never something a caller sets. And there is **no create route**: a decision is written behind the proposal's gate, so a proposal created without a gate execution could never be decided — approving it would annotate the record and report success while nothing settled it. `proposals.createProposal` is the only way to make one, and the only caller that knows the execution id to stamp.

### Reads share one filter vocabulary

`ProposalFilters` — `status`, `decision`, `conversationId`, `excludeSuperseded`, `excludeExpired` — is translated by a single builder, so a filter cannot come to mean one thing on the HTTP list and another on the in-process one. `list()` is the only read that consumes it: it applies the filters as a conjunction, then sorts and pages in Elasticsearch. `decidedWithinHours` goes through the same builder, bounding a closed queue to a recency window rather than all decided history.

An open queue filters on `status: 'pending'`, which is the whole "awaiting" condition. `excludeExpired` is still worth passing alongside it, because it filters on the deadline *date* rather than the status: between the deadline passing and the gate workflow settling the record there is task lag during which it still reads `pending`.

A recently expired proposal *does* reach a closed queue, through `decidedWithinHours`: `update` stamps `decidedAt` whenever it settles a proposal, including one nobody decided, so "you missed this" surfaces as activity. It carries no `decision`, though — which is why a consumer must classify on the status. `isAwaitingDecision()` exists for exactly that, and classifying on the decision instead puts an unanswerable proposal back in the open queue.

**The two decision routes are privilege-checked bridges to the gate, not writers.** Each loads the proposal, asserts no decision exists yet, asserts the deadline has not passed, compares the submitted `actionInput` against the record on an approval, and resumes. The workflow behind the gate records the decision.

They do make **one narrow write**, because `waitForApproval` reconstructs its resume payload and discards everything but the boolean:

```214:220:src/platform/plugins/shared/workflows_execution_engine/server/step/wait_for_approval_step/wait_for_approval_step.ts
      transformResumeInput: (input, respondedBy) => {
        const approved = input?.approved;
        return {
          response: { approved: approved === true },
          respondedBy,
        };
      },
```

So `dismissReason` and `rationale` cannot reach the workflow through the gate. `releaseGate` therefore writes **only those two fields**, and only after every refusal has passed — the decided check, the expiry check and the action-input comparison all come first, so a rejected decision leaves the record exactly as it found it. Ordering matters more than it looks: an annotation written ahead of a conflict would leave a dismiss reason on a proposal that was never dismissed, and a later approval would land on top of it. The line is "the route annotates, the workflow decides." A dismissal arriving through the platform's own resume API simply carries no reason, which is fine because both fields are optional.

A resume that fails *after* that point does leave the annotation behind on an undecided proposal. That window cannot be closed without a transaction, and it is the better trade: annotating after the resume would race the workflow's own decision write and lose the reason outright.

The service surface follows from that: `releaseGate()` makes at most that one annotation write, `clone()` re-offers a failed proposal, and `update()` is the workflow's entry point. There is no `approve()`, `dismiss()` or resume-failure rollback — with no decision written before the resume, there is nothing to roll back.

### Invariants worth preserving

- **The decision is written behind the gate, by the workflow.** Every resume surface funnels through the gate, so one write there covers them all; a write in the approve route would only ever cover that route.
- **Nothing durable is written before the resume**, so a failed resume needs no rollback. The sole exception is the dismiss reason, which the gate cannot carry.
- **The privilege check precedes every read and write on the answered path.** The chain resolve reads the proposal on the resumer's behalf, so it waits for the check too; an unauthorized resumer is re-parked before anything is read for it. Gate timeout, attempt-budget exhaustion, and the workflow-level fallback settle through `settleIncompleteProposal`, which skips the privilege check so a denied resumer's API key cannot strand the record. On the answered path, a write that failed before the check would leave the gate spent and the proposal stranded.
- **A settled status cannot move and a decision cannot be overwritten.** Two independent guards, because the two axes settle independently.
- **The gate step is resolved explicitly.** The platform's waiting-step lookup only matches `waitForInput`; for a `waitForApproval` gate it returns nothing and would resume *without* claiming the step or stamping the audit envelope. `resumeGate` finds the step itself and passes `stepExecutionId`.
- **The decision actor is server-derived.** Never accepted from a request body. `createdBy` and `decidedBy` store `{ username, fullName, email, profileUid? }`, the shape Cases established: the profile uid is the stable identity a UI resolves an avatar from, and the names are stored rather than looked up so attribution survives a missing profile. The uid is genuinely often absent — security disabled, a `run-as` proxy, a session without a profile, or an API key whose creator has no activated profile, which is exactly what the resume path runs under.
- **Approval carries the action input the approver was shown**, so an approval that no longer matches the record is refused with a conflict.
- **Action metadata is resolved on read** from the action workflow's `consts.actionMetadata`, never copied onto the proposal, so a catalog change is picked up rather than going stale. `impact` is the exception: it is snapshotted at creation, as `params.impact ?? metadata.impact ?? 'low'`. The caller wins because it knows the situation the proposal came out of, which the action's own metadata cannot; the `low` floor exists because `impactRank` is the queue's primary sort key and must always have a value.
- **`actionInput` is validated at creation**, against the schema the action declares on its manual trigger, so a proposal that could never run never reaches a human. Best-effort: the JSON Schema to zod conversion does not cover every keyword.
- **The queue's order lives in Elasticsearch.** `impact` and `confidence` are keywords, which sort alphabetically, so each is mirrored by a numeric rank written at creation. That is what makes the list pageable rather than capped at one fetch; the ranks are stripped before a proposal leaves the service.
- **`category` is an arbitrary keyword this plugin does not own.** Each solution defines the vocabulary its own actions declare and its own queries group by — AlertZero's set is not NightShift's — so there is no shared enum and no default to fall back on. Resolved as `params.category ?? metadata.category`, the same precedence as `impact` and for the same reason; a caller-supplied value is also the *only* way a proposal carrying no action gets one, since there is no action metadata to read it from. That matters because consumers group the queue by category and drop what has none, so an uncategorised non-action proposal would have nowhere to appear. Nothing sorts on it, and which category leads is a UI decision rather than a stored rank.

## Managed workflows

The plugin calls `registerManagedWorkflowOwner` in `setup()` and passes the same id to `initManagedWorkflowsClient`. Both must equal the `pluginId` on every definition it owns, or `assertPluginRegistration` throws on install.

Registering the owner is not optional. The startup sweep `cleanupUnregisteredOrphans` force-deletes any managed workflow whose `managedBy` is not in the setup-time owner registry, so an unregistered owner gets its own workflows deleted on every boot, racing its installs.

## Index naming

`.kibana-proposals` is permanent. `.kibana*` is already granted to the `kibana_system` role, so the index needs no Elasticsearch-side system index registration — a dedicated prefix such as `.proposals` would. `anonymization` ships `.kibana-anonymization-profiles` on the same reasoning.

## Testing the gate workflow

Three layers, because no single one reaches the whole thing.

**YAML shape** — `kbn-workflows/managed/definitions/proposals/create_proposal.test.ts` parses the definition and asserts how the loop is wired: that the privilege check precedes every write, that each settle branch breaks, that no condition mixes `and` with `or`. Cheap and fast, but it only sees structure.

**Loop behaviour** — `integration_tests/create_proposal.test.ts` runs the **shipped YAML through the real execution engine**, with Elasticsearch replaced by a Map and the real `ProposalsService` behind it:

```bash
node scripts/jest_integration --config x-pack/platform/plugins/shared/proposals/integration_tests/jest.integration.config.js
```

It uses `WorkflowRunFixture` from `@kbn/workflows-execution-engine/test_helpers`, which drives `runWorkflow`/`resumeWorkflow` against mocked repositories — real graph builder, real node implementations, real Liquid, no stack, a few seconds. Custom steps are injected by stubbing `hasStepDefinition` **and** `getStepDefinition` on the extensions mock; stubbing only the getter makes `nodes_factory` skip the branch and read `proposals.createProposal` as a connector.

This is the layer that covers what a shape test cannot see: that the gate re-parks on a *new* step execution so a second answer can be claimed, that a privilege denial writes nothing, that `data.set` variables survive a park and resume, that an action failure clones with an inherited deadline and re-parks, and — the bug class that actually bit during development — that every decision/status pair the workflow writes is one the service accepts.

Keeping the real `ProposalsService` rather than a stub is deliberate: the valid-pair table and the immutability guards are exactly what a workflow gets wrong, so stubbing them out would remove the point.

**Real stack** — Scout API coverage for the HTTP surface is still to come ([#19347](https://github.com/elastic/security-team/issues/19347)): the `403` for a reader, the `409` on a concurrent decision, the asynchronous decision the UI has to refetch for, and the identity assertion that a created rule's `created_by` is the approver. Until then the runbook below covers those by hand.

Deliberately uncovered: the real deadline timing, see "Known limitations".

One blind spot worth knowing about. Both layers read the YAML *raw* — the shape tests with `yaml.parse`, and `WorkflowRunFixture` with `YAML.parseDocument(...).toJSON()` — so neither sees which keys the full `WorkflowSchema` models. That matches how managed workflows install, since `lightweightValidation` does not validate steps either, so the fixture is faithful to production. What it cannot tell you is that a key is unmodelled, and therefore honoured only by that skipped validation. The schema-parity test in `@kbn/workflows` covers exactly that, and names the two keys in this definition which are load-bearing by accident.

## Manual verification

The point of the exercise is the identity behaviour: a rule created by an approved action should be attributed to the **approving analyst**, not to whoever started the Worker. When a workflow parked on `waitForApproval` is resumed through the in-Kibana resume path, the engine schedules a fresh task with an API key granted on the resumer's behalf, and that identity propagates into child workflows.

**Prerequisites** — all four are load-bearing, and the identity behaviour degrades silently without them:

- **This plugin enabled** (`xpack.proposals.enabled: true`). It is **off by default**, so without this the routes 404 and AlertZero's proposals panel renders its load error rather than a queue.
- **Security enabled.** With security off no API key is stored, the resume task gets no fake request, and the resume fails outright.
- **Encrypted Saved Objects configured** (`xpack.encryptedSavedObjects.encryptionKey`). Scheduling a task with an API key throws without it.
- **API keys enabled** in Elasticsearch.

**Privileges on the approving user:**

- `all` on **Proposed Actions** — to decide. Worth exercising the negative too: a user with only `read` should get a `403` from the approve route, and a *resume* from the platform's own API by such a user should leave the proposal untouched and the gate parked again rather than failing the workflow.
- Security → **Rules** `all` (`rules-all`) — the rule is created under *their* credentials. Worth exercising deliberately: an approver **without** it should see the proposal reach `approved` + `failed`, and a fresh `pending` clone appear pointing at the same gate execution. That is the retry loop working as designed.
- `workflowsManagement` execute — the resume route rides on `execute` until step-level privileges land ([#19134](https://github.com/elastic/security-team/issues/19134)).

**Steps:**

1. Start Kibana. On start this plugin installs `system-create-proposal` globally, and `alertzero` installs `system-alertzero-action-create-rule` and `system-alertzero-action-edit-rule`. Confirm all three appear in Workflows management, and that the log contains no `orphan_cleanup` deletion for them.
2. Trigger the gate workflow directly with `conversationId`, `actionWorkflowId: system-alertzero-action-create-rule`, and an `actionInput` carrying `name`, `description`, `query` and `index`.
3. Confirm the record: `GET .kibana-proposals/_search` should show `status: pending` with **no `decision` field**, `category: tune`, the `actionWorkflowId`, and a `workflowExecutionId` pointing at a gate execution that is `waiting_for_input`.
4. Approve from the AlertZero app (`/app/alertzero`) — under "Awaiting your decision" on the landing page, or the investigation's Proposals tab.
5. Assert the outcome: the proposal reaches `decision: approved` with `status: succeeded`; a **disabled** rule with that name exists (`security.createRule` always creates rules disabled); **`created_by` on the rule is the approver**, not whoever triggered the gate; and the `waitForApproval` step execution carries `hitl.respondedBy`.
6. Repeat in a non-default space. Space scoping is invisible in `default`: every query filters on `spaceId`, and a missing filter would only show up elsewhere.

**Also worth exercising:**

- **Dismissal with a reason** — reaches `decision: dismissed` with `status: no_action`, records `dismissReason` and `rationale`, creates no rule.
- **A non-action proposal** created with a `comment` and no `actionWorkflowId` — should terminate at `decision: approved` with `status: no_action`, executing nothing.
- **First-actor-wins** — approve from two sessions at once. One `200`, one `409`; the action runs once.
- **The asynchronous decision** — immediately after approving, the route's response body still shows no `decision`. Confirm the UI reflects the decision anyway, which means it refetched rather than trusting the response.
- **An unprivileged resume** — resume the execution through the platform's resume API as a `read`-only user. The proposal should be untouched and the gate parked on a *new* step execution, so a privileged approver can still decide it.
- **The retry loop** — approve as a user without `rules-all`. The first proposal settles at `approved` + `failed`, a clone appears at `pending` sharing the original's `expiresAt` and `workflowExecutionId`, and the original carries `supersededBy`. The queue should show only the clone.

## Known limitations

- **Two steps rely on an `on-failure` their schema does not model** ([#19315](https://github.com/elastic/security-team/issues/19315)). Neither `WaitForApprovalStepSchema` nor `WorkflowExecuteStepSchema` merges `StepWithOnFailureSchema`, unlike the connector-derived schema every custom step gets — so zod drops the key on any path that validates steps against the full schema. The engine honours it on both: a HITL wait fails through the ordinary `failStep` path with a `TimeoutError`, and `handleStepLevelOnFailure` wraps any step declaring the key with no exclusion by type. Both are load-bearing here — the gate's settles an unanswered proposal, the action's keeps a failed action inside the loop to be cloned — and they reach the engine only because managed workflows install under `lightweightValidation`, which does not validate steps. The schema-parity test beside the definition pins exactly these two so a third cannot appear unnoticed, and so the list shrinks when #19315 lands.
- **An exhausted iteration budget settles as `expired`.** `max-iterations` is 200 with `on-limit: continue`, so hitting it exits the loop into `settle_unfinished`, which calls `settleIncompleteProposal` with `status: expired` and reports `final_status: expired`. Reaching the limit means something spun — a resumer who keeps failing the decide check, or a long chain of action retries.
- **A write can still lose a race to a revision.** Every write is preceded by the one adopt, but a revision landing in the window between them makes the write conflict. Nothing retries, so a conflict reaches the workflow-level handler — which adopts and settles the live head rather than stranding it. Losing a decision to a millisecond race is bad but bounded, and a retry per write would undo the single-adopt simplification. If it ever matters, the fix is one retry around the whole post-adopt section, not one per write.
- **A decision resumed past the deadline is accepted for a few seconds.** The engine schedules the gate's timeout task at the deadline, but it fires when Task Manager claims it, and `resume()` only checks expiry when the wake carries no input. A resume arriving in that gap is taken. The approve and dismiss routes are not affected — `releaseGate` refuses an expired proposal — so this is reachable only through the platform's generic resume API or the Inbox. Not worth a step in the loop to catch at 72h deadlines.
- **Deep paging stops at 10,000.** The list pages with `from`/`size` inside Elasticsearch's default result window. Going past that needs `search_after`, which the list does not expose yet.
- **`.kibana-*` index naming** buys us out of a system index registration, at the cost of living in a namespace we do not own.
- **No Scout API coverage yet.** The HTTP surface is covered by Jest only, as `anonymization` shipped.
- **Proposals without a conversation.** Every proposal points at a `conversationId` and a `workflowExecutionId`; a standalone execution cannot create one yet.
