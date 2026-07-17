# Mode Select — Copy Options

## Option A: Intent-oriented

> **Field label:** What are you detecting?

| | Signal | Alert |
|---|---|---|
| **Title** | A pattern to investigate | A problem to act on |
| **Description** | Build a baseline, spot trends, or collect evidence. Each match is recorded as a queryable data point — no episodes, no notifications. | Follow a problem from first detection to resolution. Each match opens an episode that tracks state (pending → active → recovering → inactive) and notifies your team at each transition. |

**Pros:** Field label is a question — turns config into a decision. Titles name the user's intent, not the mechanism. Clear cognitive split: "still figuring it out" vs "know it matters."

**Cons:** "A pattern to investigate" is awkward as a title — it's a noun phrase that reads like a sentence fragment. The state machine in the alert description (pending → active → recovering → inactive) is system jargon that most users won't map to their workflow.

---

## Option B: Action-oriented

> **Field label:** When a match is found

| | Signal | Alert |
|---|---|---|
| **Title** | Record it for later | Open an episode and notify |
| **Description** | Each result is stored for querying. Nothing else happens — no episodes, no notifications. Useful when you're still deciding whether something is worth alerting on. | The rule opens an alert episode to track the problem, moving it through states from pending to recovered. Action policies evaluate each state change and can trigger workflows — Slack, email, webhooks. |

**Pros:** Most technically precise. "Nothing else happens" is disarmingly honest and instantly communicates scope. Alert description names concrete outputs (Slack, email, webhooks).

**Cons:** Reads like documentation, not product UI. "Record it for later" is passive and uninspiring — doesn't help the user feel confident in their choice. "Open an episode and notify" is a system action, not a user goal.

---

## Option C: Scenario-oriented

> **Field label:** How should the rule behave?

| | Signal | Alert |
|---|---|---|
| **Title** | Observe silently | Detect and respond |
| **Description** | You're exploring — building detection logic, establishing baselines, or collecting evidence before wiring up notifications. Matches are recorded, nothing more. | You have a known condition that needs attention. The rule tracks each problem as an episode from first breach to recovery, notifying your team along the way. |

**Pros:** Descriptions speak directly to the user ("you're exploring", "you have a known condition"). Natural language, no jargon. The scenario framing helps users self-select without understanding system internals.

**Cons:** "Observe silently" is weak — implies passive/hidden behavior, doesn't convey that data is being captured. Descriptions lean on motivation over mechanics — a power user might not get enough signal about what actually happens technically. "From first breach to recovery" is slightly imprecise (episodes go pending → active → recovering → inactive, not just breach → recovery).

---

## Recommendation

Option C has the best descriptions — they meet the user where they are. Option A has the best field label — a question beats a noun. Option B is the most accurate but the least human. A strong hybrid would take **Option A's field label**, **Option C's descriptions**, and write new titles that are active verbs rather than noun phrases.
