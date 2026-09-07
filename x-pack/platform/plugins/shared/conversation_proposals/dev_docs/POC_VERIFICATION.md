# Action proposal PoC — end-to-end verification

Proves the architecture end to end: an agent suggests an action, a human approves it, and the
action executes **as the approver**.

The identity behaviour is the point of the exercise. When a workflow parked on `waitForApproval` is
resumed through the in-Kibana resume path, the engine schedules a fresh task with an API key granted
on the **resumer's** behalf, and that identity propagates into child workflows. So the detection
rule created by the action workflow should be attributed to the approving analyst, not to whoever
started the worker.

## Prerequisites

All three are load-bearing — the identity behaviour silently degrades without them:

- **Security enabled.** With security off, no API key is stored, the resume task gets no fake
  request, and the resume fails outright.
- **Encrypted Saved Objects configured** (`xpack.encryptedSavedObjects.encryptionKey`). Scheduling a
  task with an API key throws without it.
- **API keys enabled** in Elasticsearch.

Plus:

- `xpack.pnd.enabled: true` and `xpack.pnd.ui.useMockData: false` in `kibana.yml`.
- An LLM connector the `ai.agent` step can use, so the PoC worker can produce structured output.

## Roles

Create one user for approving. They need:

- `proposals_write` (from the **Conversation proposals** feature) — to decide.
- Security → **Rules** `all` (`rules-all`) — because the rule is created under *their* credentials.
- `workflowsManagement` execute — the resume route rides on `execute` until step-level privileges
  land ([#19134](https://github.com/elastic/security-team/issues/19134)).

Worth checking deliberately: an approver **without** `rules-all` should see the proposal move to
`failed`, not `succeeded`. That failure is the model working as designed.

## Steps

1. **Start Kibana.** On start, the `conversationProposals` plugin installs
   `system-create-conversation-proposal` globally, and the `pnd` plugin installs
   `system-alertzero-action-create-rule` and `system-alertzero-poc-action-worker`.

2. **Confirm the workflows installed.** In Workflows management, all three should be present. The
   worker ships **disabled**.

3. **Enable and run the worker.** Enable `system-alertzero-poc-action-worker` and run it manually.
   Its `ai.agent` step invents a harmless `PoC`-prefixed rule and hands the proposal intent to the
   gate workflow.

4. **Check the record.** A `pending` document should exist:

   ```
   GET .kibana-conversation-proposals/_search
   ```

   Expect `status: pending`, `category: tune`, an `actionWorkflowId` of
   `system-alertzero-action-create-rule`, and a `workflowExecutionId` pointing at the gate
   execution. Confirm the gate execution is `waiting_for_input`.

5. **Approve from the UI.** Open the AlertZero app (`/app/pnd`). The proposal appears under
   "Awaiting your decision" on the landing page, and on the investigation's Proposals tab when the
   agent created a conversation. Approve it. The confirmation modal states that the action runs
   under your identity.

6. **Verify the outcome — the actual assertion of the PoC:**
   - The proposal reaches `succeeded`.
   - A **disabled** detection rule named `PoC …` exists (the `security.createRule` step always
     creates rules disabled).
   - **`created_by` on that rule is the approving analyst**, not the user who ran the worker.
   - The gate execution completed, and its `waitForApproval` step execution carries
     `hitl.respondedBy` — present only because the approve route resolves and passes
     `stepExecutionId` explicitly.

7. **Repeat in a non-default space.** Space scoping is invisible in `default`: every proposals query
   filters on `spaceId`, and a missing filter would only show up elsewhere.

## Also worth exercising

- **Dismissal.** Dismiss with a reason. The proposal should reach `dismissed` with `dismissReason`
  and `rationale` recorded, the gate should complete down its negative branch, and **no rule should
  be created**.
- **First-actor-wins.** Approve the same proposal from two browser sessions at once. One gets `200`,
  the other `409`, and the action runs once.
- **A gate timeout.** Temporarily shorten the gate timeout in the workflow and let it expire. The
  workflow-level `on-failure` should move the proposal to `failed` rather than leaving it `pending`
  forever.
- **A non-action proposal.** Create one through the API with a `comment` and no `actionWorkflowId`.
  Approving it should terminate at `approved` without executing anything.

## Cleanup

The PoC worker is throwaway scaffolding: delete `poc_action_worker.{yaml,ts}` and its registry
entries rather than renaming them once the flow is validated.
