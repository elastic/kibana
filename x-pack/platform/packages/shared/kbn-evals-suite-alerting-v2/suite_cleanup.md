# Alerting V2 eval suite — remaining cleanup

> **Delete this file when every item below is addressed.**

Working list of iffy spots left after the recent harness/evaluator cleanup.
Not a feature backlog — see `eval_backlog.md` for new behaviours to evaluate.

## Harness / evaluator quality

- [x] **Criteria overlap / redundancy**
  Many `criteria` lines restate what CODE already scores (`expectedSkills`,
  `expectedToolIds`, render). Soft-opener criteria especially double-cover the
  same V2-vs-Security point. That dilutes the judge and makes failures noisy.
  Trimmed specs to keep judge-only behaviour (disambiguation quality, context,
  proactive offers, persistence messaging, query nuances not covered by CODE).

- [x] **Action-policy has no `expectAttachmentData`**
  CODE asserts: matcher `rule.id: "<id>"`, destination =
  `{ type: 'workflow', id: <workflowAttachment.workflowId> }`, and workflow
  `triggers: [{ type: 'manual' }]`. Grouping / throttle remain on the LLM judge.

- [x] **Even/odd message role assumption**
  Transcript now comes from `GET /conversations/{id}` `rounds` (`input` /
  `response`). Task output keeps a thin `messages` projection for Criteria;
  `getAssistantMessages` / low-score logs prefer `rounds`.

- [x] **`expectAttachmentData` picks “latest rule” ad hoc in the spec**
  Shared `getLatestAttachmentData(attachments, type)` lives in
  `expected_attachment.ts`. Still “last of type” rather than rendered-version
  preference — fine until multi-draft cases show up.

- [x] **Skip vs throw inconsistency**
  Convention: field omitted / `null` → skip (`score: null`); field present but
  empty or wrong shape (`[]`, `''`, non-array, non-function) → throw. Applied to
  Criteria and CODE evaluators.

## Repo hygiene

- [ ] **Untracked planning docs**
  `skill_eval_map.md`, `prompt_candidates.md` aren’t in git (`eval_backlog.md`
  is). Fine if private, but they won’t travel with the PR unless added.

- [ ] **Leftover WIP**
  Local `detection_rule_edit` skill tweak still sitting uncommitted — unrelated
  to the eval suite, easy to commit by accident.

## Coverage gaps (known, not bugs)

Tracked in more detail in `eval_backlog.md`:

- [ ] Federated data
- [ ] Concrete-index avoidance
- [ ] ES|QL execute validation (`LIMIT 0`)
- [ ] Workflow reuse vs create
