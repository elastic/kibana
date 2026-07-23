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

- [ ] **Action-policy has no `expectAttachmentData`**
  It only checks rendered types. Policy/workflow/rule *shape* (UUID destination,
  `rule.id` matcher, etc.) is entirely on the LLM judge. Weakest structural
  coverage in the suite.

- [ ] **Even/odd message role assumption**
  `getAssistantMessages` and low-score transcript formatting assume
  `messages[i]` is user/assistant alternating. If the chat client ever returns a
  different shape, render scoring and logs go wrong silently.

- [ ] **`expectAttachmentData` picks “latest rule” ad hoc in the spec**
  Specs have a local `getLatestRuleAttachmentData` helper. Fine for now, but
  easy to get wrong once multiple rule drafts exist (edits, retries). No shared
  helper; no “rendered version” preference anymore.

- [ ] **Skip vs throw inconsistency**
  Empty `criteria` throws; empty `expectRenderAttachment: []` throws; missing
  optional CODE metadata still skips (`score: null`). Intentional, but easy to
  misread when scanning Phoenix averages.

## Repo hygiene

- [ ] **Untracked planning docs**
  `eval_backlog.md`, `skill_eval_map.md`, `prompt_candidates.md` aren’t in git.
  Fine if private, but backlog items won’t travel with the PR unless added.

- [ ] **Leftover WIP**
  Local `detection_rule_edit` skill tweak still sitting uncommitted — unrelated
  to the eval suite, easy to commit by accident.

## Coverage gaps (known, not bugs)

Tracked in more detail in `eval_backlog.md`:

- [ ] Federated data
- [ ] Concrete-index avoidance
- [ ] ES|QL execute validation (`LIMIT 0`)
- [ ] Workflow reuse vs create
- [ ] Manual trigger on workflows
