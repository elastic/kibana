# bulkUpdateRules — tradeoffs

> Review notes for [PR #284946](https://github.com/elastic/kibana/pull/284946). This file is in the PR so reviewers can comment on individual tradeoffs. It is not product documentation.

[PR #284946](https://github.com/elastic/kibana/pull/284946) · [#264894](https://github.com/elastic/kibana/issues/264894) · [#264892](https://github.com/elastic/kibana/issues/264892)

Kibana already has two ways to change many alerting rules at once:

- **Create-many** (`bulkCreateRules`) — you hand in a list of brand-new rules. It checks them, then saves them a hundred at a time.
- **Edit-many** (`bulkEditRules` / `bulkEditRulesOcc`) — you point at existing rules and apply the *same* change to all of them (for example “add this tag”). It loads them, applies that one change, then saves the whole set in a single write.

The new method, `bulkUpdateRules`, is for a third job: “here are 200 existing rules, and each one has its *own* new definition.” Typical callers: import with overwrite, and upgrading prebuilt detection rules. Every rule in the list is already in the database, but each one is being rewritten to a different body — not the same patch applied to everyone.

<details>
<summary>See related comments from issue  #264894</summary>

Christos ([#264894](https://github.com/elastic/kibana/issues/264894#issuecomment-4333902656)):

> Encrypted SO GETs: Per-rule via pMap at concurrency 50 to retrieve existing API keys (irreducible floor — each rule's API key is stored in an encrypted saved object that must be individually decrypted).
>
> Maybe we could mimic what the current `bulkEditRulesOcc` does and use the `encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser`method and process the results in batches. We can construct a filter with the IDs by using `convertRuleIdsToKueryNode`. This should reduce the number of calls to ES.

Banderror, on sharing with bulk edit ([#264894](https://github.com/elastic/kibana/issues/264894)):

> Common infrastructure (OCC retry, bulk SO write, API key management, task schedule updates) should be shared with `bulkEdit` to avoid maintaining parallel bulk write paths — exact reuse strategy to be determined during implementation.

Banderror, on API keys when a bulk write throws ([#264892](https://github.com/elastic/kibana/issues/264892#issuecomment-4408025793)):

> When the whole `bulkCreateRulesSo` throws and we don't receive partial results, currently all api keys are being invalidated.
>
> However, `bulkCreateRulesSo` could throw in the middle of bulk indexing documents to ES, e.g. due to a network error or cluster failure. Two issues with this:
>
> 1. If it is an intermittent failure, and some rules were successfully written by the `bulkCreateRulesSo` call, invalidating their api keys might not be needed
> 2. If it's a persistent failure (network or cluster is down), the `bulkMarkApiKeysForInvalidation` call will fail too, which I'm not sure is properly handled by callers of `bulkEditRulesOcc`.
>
> I think @sdesalas might already be dealing with error handling as part of https://github.com/elastic/kibana/issues/264893, where we're considering an optimistic approach to bulk rule creation.

</details>

---

<a id="tradeoff-1"></a>
## Tradeoff: 1. To share, or not to share?

Banderror on [#264894](https://github.com/elastic/kibana/issues/264894):

> Common infrastructure (OCC retry, bulk SO write, API key management, task schedule updates) should be shared with `bulkEdit` to avoid maintaining parallel bulk write paths — exact reuse strategy to be determined during implementation.

This request is a bit contradictory. 🤔

Banderror asked us _not_ to maintain two write paths. Sharing one orchestration layer for both `bulkEdit` and `bulkUpdate`. But then he also says to _reuse common infrastructure with flexibility on reuse strategy_, which implies two write paths. Two orchestration layers, but shared helpers.

With that last interpretation in mind: `bulkEditRulesOcc` seems like the *orchestrator*, not the infrastructure we should share.

In any case, this is not entirely clear either so here are the options (sharing or not sharing orchestration layer).

| Primitives | Option A: re-use `bulkEditRulesOcc` | Option B: own orchestrator, shared helper infrastructure |
| --- | --- | --- |
| Load | PIT decrypt + `convertRuleIdsToKueryNode` | Same |
| Bulk SO write | `bulkCreateRulesSo` overwrite, inside private `saveBulkUpdatedRules` | Same `bulkCreateRulesSo` call, own catch |
| API keys | `createNewAPIKeySet`; invalidate via `bulkMarkApiKeysForInvalidation` | Same mint; same invalidation. |
| TM schedules | `taskManager.bulkUpdateSchedules` **after** OCC returns | Same API, inside the batch (`updateTaskSchedules`) |
| OCC retry | `retryIfBulkEditConflicts` wrapping OCC | Own `writeWithRetry` (tradeoff 3) |

Note that changes to `bulkEditRulesOcc` or `saveBulkUpdatedRules` to accommodate new functionality would require retesting every caller that already depends on it.

**Option A — Call `bulkEditRulesOcc` / `saveBulkUpdatedRules` as the write path.**

- Pros: One orchestrator. That is the first reading of Banderror (“don’t maintain two write paths”). Reviewers see one write path.
- Cons: Reusing `bulkEditRulesOcc` breaks up the orchestration into 2 layers. Complicating things unnecessarily. The batch loop, per-id merge, TM, and Update authz still need to be carried out outside of it. We also inherit edit’s save catch (a throw wipes every new key in that call, then rethrows) and edit’s 409 retry if we wrap it the same way.

**Option B — Own orchestrator (same shape as `bulkCreateRules`: preValidate, then write `batchSize` at a time). Same primitives:** PIT decrypt, `bulkCreateRulesSo` overwrite, `createNewAPIKeySet`, `taskManager.bulkUpdateSchedules`.

- Pros: Simpler overall. Same underlying infrastructure primitives as `bulkEdit`, but self-contained instead of spread across 2 namespaces. Sequence matches the API (per-id bodies, batches of 100). A failed save only risks that batch. OCC retry and the 264892 catch stay where they belong (tradeoffs 3 and 4), instead of arriving as side effects of calling OCC.
- Cons: Two orchestrations. That is the duplication Banderror wanted to avoid. A reviewer who reads “shared with bulkEdit” as “call `bulkEditRulesOcc`” will still ask why we didn’t.

**We picked B.** Share the primitives; leave the orchestrator alone. Why? We are over-complicating otherwise. Logic reuse looks _simpler in theory than in practice_. In this code it isn’t. We still have to include per-id merge, so most of the logic stays either way. Calling it means a translation layer for batches, 409s, and TM, not less code. Overall, its simpler to tailor the orchestration approach to rule updates. Rather than try to walk around it.

---

<a id="tradeoff-2"></a>
## Tradeoff: 2. Apply `enabled` inside `bulkUpdateRules`?

Single `updateRule` never turns a rule on or off. Neither does `bulkEditRules` (`enabled` is not an editable field). That is a different product path (`enableRule` / `disableRule`, and the bulk equivalents): Task Manager creates or pauses a job, the circuit breaker may fire, a key may be minted, authz is different. Detection-rule import and patch already split it that way today — update the definition, then `toggleRuleEnabledOnUpdate`.

This method is an alerting API. The Security callers in this PR (import overwrite, prebuilt upgrade) still need a final on/off; that is extra work those callers do after the batch. Folding toggle into the rewrite would reimplement enable/disable inside a save (mint on enable, write `apiKey: null` on disable) and buy little for this one method.

Callers must not think they can pass `enabled` and have it stick. `UpdateRuleData` types `enabled?: never` (spreading a `boolean` fails the type check). The overwrite always writes the rule’s existing `enabled`.

**Option A — Honour a requested `enabled` change inside `bulkUpdateRules` (schedule/unschedule tasks, mint keys, authz for enable).**

- Pros: One call does update + on/off.
- Cons: Duplicates `bulkEnableRules` / `bulkDisableRules`. Retests that path. Callers of `updateRule` still could not flip `enabled` the same way.

**Option B — Do not flip `enabled`. Callers that need a change use `bulkEnableRules` / `bulkDisableRules` after.**

- Pros: Same as `updateRule`. No TM create/delete in this method. We still rewrite the paused task’s interval when it changed (tradeoff 8), so a later enable wakes the right cadence.
- Cons: Callers must still honor the file’s `enabled` in a follow-up.

**We picked B.** Extra enable/disable logic should take place after the whole update batch is finished.

---

<a id="tradeoff-3"></a>
## Tradeoff: 3. OCC 409: `retryIfBulkEditConflicts`, or reload-and-PUT?

During `bulkCreateRulesSo` overwrite with PIT loaded OCC `version` (`_seq_no`, `_primary_term`) Elasticsearch returns **409** if something else wrote it first (TOCTOU).

`updateRule` already retries a couple of times ([PR #77838](https://github.com/elastic/kibana/pull/77838), `RetryForConflictsAttempts`). `bulkEditRulesOcc` uses `retryIfBulkEditConflicts` (reload, reapply the same patch, rewrite everything). Retrying means another `createNewAPIKeySet`, and a real competing save would 409 again.

Note that **most 409's come from rule background execution updating the rule** (see [`retry_if_conflicts.ts`](https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/alerting/server/lib/retry_if_conflicts.ts#L8-L12)). While we are saving an import or upgrade, the runner is writing last-run status onto the same document. That is not two people editing the same rule. Without retry, import/upgrade of *running* rules would fail at random.

**Option A — Reuse `retryIfBulkEditConflicts` (reapply the same patch, rewrite everything).**

- Pros: Step 9 of [#264894](https://github.com/elastic/kibana/issues/264894) asked for this.
- Cons: `retryIfBulkEditConflicts` is *the wrong shape*. We are not applying one shared patch, we have different payload per rule. Modifying this method to fit our criteria is chasing [the wrong abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction). It would mean complicating our logic to be able to map whole payloads per rule on a [`filter`](https://github.com/elastic/kibana/blob/fab6469adfdc862a95f732b33dc2319b0822a6e4/x-pack/platform/plugins/shared/alerting/server/rules_client/common/bulk_edit/retry_if_bulk_edit_conflicts.ts#L77) that changes with each retry. Making it hard to follow, confusing and error prone.

**Option B — Reload-and-PUT for 409 rows only, like `updateRule`: invalidate the new key, wait 100ms, `loadRulesByIds` those ids, `prepareUpdate` again (fresh `version`, same `item.data`, new key), overwrite. `RetryForConflictsAttempts` (2 retries / 3 attempts). Then per-item error.**

- Pros: Simpler logic. Authz, circuit breaker, migrate, and audit already ran. Retry is a small loop over the 409 ids with the payloads we already have. More readable, slightly more performant as it can be optimized for this flow.
- Cons: A second OCC retry path.

**We picked B.** Right tool for the job. Easier to follow for a per-id, per-payload write than a KQL `filter` callback written for single payload.

---

<a id="tradeoff-4"></a>
## Tradeoff: 4. Must we patch `saveBulkUpdatedRules` ([#264892](https://github.com/elastic/kibana/issues/264892)) before this ships?

[#264894](https://github.com/elastic/kibana/issues/264894) says it depends on [#264892](https://github.com/elastic/kibana/issues/264892). The problem: if `bulkCreateRulesSo` throws, we must not leave (or wipe) API keys in a way that breaks rules. The ticket as written says: if the save throws with no row-by-row result, accept `bulkMarkApiKeysForInvalidation` on all the new keys; if some rows succeeded and some failed, invalidate **new** keys for the failures and **old** keys for the successes.

Banderror later pushed back on “just accept the full throw” ([comment](https://github.com/elastic/kibana/issues/264892#issuecomment-4408025793)): Elasticsearch may have saved some rules before the throw, and if the cluster is down `bulkMarkApiKeysForInvalidation` may fail too.

**Option A — Fix `saveBulkUpdatedRules` first, then reuse it.**

- Pros: Honours the “depends on” line. One shared fix.
- Cons: We are not using that function (see tradeoff 1). This work would wait on a change Banderror is not even sure is the right fix.

**Option B — Copy that invalidate-new-on-fail / invalidate-old-on-success policy inside our `batchSize` writes. Leave `saveBulkUpdatedRules` alone.**

- Pros: The new method can ship. A throw only risks one batch of keys, not the whole import. When Elasticsearch *does* return per-row results, we already wipe new keys on failure and old keys on success, which is what the ticket asked for.
- Cons: If a save throws with no row-by-row result, we still wipe every new key in that batch — including for rules Elasticsearch may already have written. Batches shrink that from the whole import to 100 rules; they do not remove it. A later bulk operation can regenerate those keys, but in the meantime _the rule keeps the dead key_. We did not close [#264892](https://github.com/elastic/kibana/issues/264892).

**We picked B.** Copy the behaviour. Don’t wait on a patch to a helper we aren’t calling. The conditions for this bug to arise are rare and the approach mirrors existing behavior. A [search found no conclusive matches](https://github.com/elastic/sdh-security-team/pull/1787) to existing SDHs in `elastic/sdh-security-team` regarding dead or invalid keys. We also mitigated the risk by reducing batch sizes but did not remove it altogether.

---

<a id="tradeoff-5"></a>
## Tradeoff: 5. Load with `getDecryptedRuleSo` per id, or with `createPointInTimeFinderDecryptedAsInternalUser`?

Each rule stores an Elasticsearch API key. It is encrypted. To retire the old key after we replace it, we have to read it first.

The ticket said: fetch each rule one at a time, 50 in parallel (`pMap` + `getDecryptedRuleSo`), because each encrypted document has to be decrypted on its own ([#264894](https://github.com/elastic/kibana/issues/264894)).

Christos disagreed: use the same paged read edit-many already uses, filtered to the ids we care about ([comment](https://github.com/elastic/kibana/issues/264894#issuecomment-4333902656)).

**Option A — `getDecryptedRuleSo` per id via `pMap` at concurrency 50** (what the ticket wrote; same as `updateRule`).

- Pros: If rule 47 is missing, we know it immediately. If decrypt fails, we can still load the document without the key (`getRuleSo`, what `updateRule` does today).
- Cons: A 2000-rule import is 2000 extra round trips. Christos’s point: we do not actually have to do it that way.

**Option B — One paged read of those ids, using `createPointInTimeFinderDecryptedAsInternalUser` with a `convertRuleIdsToKueryNode` filter** (what Christos suggested, and what edit-many already uses).

- Pros: Far fewer calls. Same load path as edit-many. If an id is not in the results, we record an error for that rule and continue.
- Cons: Risk of [orphaned credential](https://github.com/elastic/kibana/issues/286812) similar to [`bulkEditRulesOcc`](https://github.com/elastic/kibana/blob/ff149f09f93dab5d047450cb493bab7fad976c4d/x-pack/platform/plugins/shared/alerting/server/rules_client/common/bulk_edit/bulk_edit_rules_occ.ts#L89-L101). Decrypt failure means ESO returns the SO with `error` set and the two encrypted fields (`apiKey`, `uiamApiKey`) stripped. If we don't check `so.error`, the row is treated as a normal original: we mint new keys if the rule is enabled and overwrite. The rule body is fine, but we cannot invalidate the old keys because they are gone from the document. [`updateRule`](https://github.com/elastic/kibana/blob/ff149f09f93dab5d047450cb493bab7fad976c4d/x-pack/platform/plugins/shared/alerting/server/application/rule/methods/update/update_rule.ts#L99-L117) falls back to an extra undecrypted GET, logs, and skips invalidation, so at least it is not silent.

**We picked B.** Same PIT path as edit-many, as [suggested](https://github.com/elastic/kibana/issues/264894#issuecomment-4333902656) by Christos. The orphaned-key leftover is pre-existing on `bulkEditRules` and is not addressed here ([#286812](https://github.com/elastic/kibana/issues/286812)).

---

<a id="tradeoff-6"></a>
## Tradeoff: 6. `bulkEnsureAuthorized` (throw the call), or `ensureAuthorized` per rule?

`bulkCreateRules` calls `bulkEnsureAuthorized(Create)` on the type/consumer pairs in the list. If any pair is forbidden, the whole request throws and nothing is saved. `updateRule` calls `ensureAuthorized(Update)` for that one rule — only that rule fails.

**Option A — `bulkEnsureAuthorized(Update)` on the loaded type/consumer pairs; any miss throws this `bulkUpdateRules` call.**

- Pros: Same as create-many. Simple. For detection-rule import/upgrade, mixed permissions are rare (same user, same kinds of rules).
- Cons: One forbidden pair fails every rule in *this* call. That is not the whole HTTP import: the import API already splits the file (50 rules). Earlier splits stay saved. If this call has already written an inner batch (tradeoff 9), those rows stay saved too.

**Option B — `ensureAuthorized` per rule; unauthorized rules become per-item errors, the rest save.**

- Pros: Allowed rules still save.
- Cons: Half-saved imports that look like a bug. More special cases.

**We picked A.** Type/consumer pairs that are not allowed are rare. Throw the call, before writes.

---

<a id="tradeoff-7"></a>
## Tradeoff: 7. `validateScheduleLimit`: throw the call, or skip the rules that don’t fit?

Kibana limits how many rule runs per minute the cluster will take (`validateScheduleLimit`). `updateRule` only checks this when that rule is already on **and** you changed how often it runs. `bulkCreateRules` throws the whole request if the new load doesn’t fit.

**Option A — Throw this `bulkUpdateRules` call** (nothing in *this inner batch* is saved yet; earlier inner batches in the same call may already be saved — tradeoff 9).

- Pros: Same as create-many. You don’t save half the batch then discover the cluster can’t take the new run rate.
- Cons: Earlier batches are already written (SOs, invalidated keys, rescheduled tasks) but the caller never gets `successfulIds`. One too-aggressive interval fails the whole remaining list.

**Option B — Per-item error on the rules that don’t fit, save the others in this batch.**

- Pros: The rest of the overflowing batch still saves.
- Cons: The check is about the *cluster*, not one rule. Saving some and skipping others can still leave you over the limit.

**Option C — Return the circuit-breaker as errors, halt remaining batches.** The overflowing batch fails as a whole (no `prepareUpdate`, so no keys minted). Later batches are not re-checked. Every leftover rule gets the same error. Earlier batches stay in `successfulIds`.

- Pros: Callers can see what landed and retry the rest. Same “fail the overflowing set” semantics as A, without swallowing `successfulIds`.
- Cons: Still not the same as create-many (which throws before any write). Rules in the overflowing batch whose interval did not change also fail.

**We picked C.** Run `validateScheduleLimit` on enabled rules whose interval changed. Overflow returns errors and stops the loop. `bulkMigrateLegacyActions` runs after this check, just before `writeWithRetry`, so a trip does not delete legacy sidecar SOs / `siem.notification` rules for rows we then never update.

---

<a id="tradeoff-8"></a>
## Tradeoff: 8. If `taskManager.bulkUpdateSchedules` fails, is the rule a failure?

After `bulkCreateRulesSo`, we call `taskManager.bulkUpdateSchedules` when the rule has a `scheduledTaskId` **and** the interval changed — on or off. Same as `updateRule` and bulk edit (`bulkUpdateTaskSchedules`). Edit-many sends *one* interval for every rule. We group by the **new** interval, because each payload can differ.

`updateRule` already saves the SO first, then talks to Task Manager, and if that fails it **logs and continues**. The rule is updated; it may keep running on the old interval until something else fixes it.

**Option A — Log and swallow. The rule stays in `successfulIds`.**

- Pros: Same as `updateRule`. We don’t fail an import because Task Manager hiccupped after a good save.
- Cons: A rule can be saved with a new interval and still *run* on the old one until the next fix.

**Option B — Treat that rule as a per-item error.**

- Pros: The caller sees that Task Manager didn’t follow.
- Cons: The SO *was* saved. The error is misleading. Callers may retry and `createNewAPIKeySet` again.

**We picked A.**

---

<a id="tradeoff-9"></a>
## Tradeoff: 9. Who chunks — `bulkUpdateRules`, `DetectionRulesClient`, or the import/upgrade callers?

The import HTTP route already splits the file into groups of 50. Inside that, overwrite still hands that chunk’s `toUpdate` list to one `rulesClient.bulkUpdateRules` call. The upgrade handler already splices its queue at 100 (`PREBUILT_RULES_UPGRADE_BATCH_SIZE`) before it loads installed rules. We said the *callers* should chunk, so upgrade can load only the ids in the chunk and not hold thousands in memory.

**Option A — Chunk inside `bulkUpdateRules` or `DetectionRulesClient.bulkUpdateRules`.**

- Pros: Every caller gets batching. A `bulkEnsureAuthorized` / `validateScheduleLimit` throw only affects 100 rules, even if someone passes 2000 ids.
- Cons: Upgrade would still have loaded all those rules *before* calling us. It doesn’t fix the memory problem.

**Option B — Callers chunk. This method still enforces `MAX_BULK_UPDATE_BATCH_SIZE` (500) / default 100 as a backstop.**

- Pros: Upgrade can load 100, update 100, load the next 100. This method stays “save this list.”
- Cons: Import overwrite does not slice further than the route’s chunk. If the circuit breaker fires on a later inner batch (tradeoff 7), earlier inner batches in that call are already saved — the caller does get those ids back now.

**We picked B.** `DEFAULT_BULK_UPDATE_BATCH_SIZE` / `MAX_BULK_UPDATE_BATCH_SIZE` stays as a safety net.

---

<a id="tradeoff-10"></a>
## Tradeoff: 10. Skip unchanged: inside alerting, or in the caller?

For performance reasons we need to decide if a rule that did not change should be updated at all. 

We can make that check and apply the skip _inside_ solution code, OR we can apply that skip inside alerting framework domain. Both are valid options. Both have tradeoffs.

Detection `rules/_import` (overwrite path) already has the installed rules loaded(`findInstalledRulesByRuleIds`). So we know whats persisted on disk without additional lookup. A caller could simply remove unchanged rules before it calls `bulkUpdateRules` in AF. 

If alerting owns the skip, this would be the sequence we would compare with on-disk version after PIT decrypt and validation, using `incrementRevision` or similar to see if it changed. 

Those skipped ids would still count as success. _But nothing would change_.

Note that `updateRule` always writes, regardless of any fields being modified. This is sometimes used informally for [rotating API keys](https://github.com/elastic/sdh-security-team/issues/1026#issuecomment-2236628506). However `bulkEditRules` skips when there is nothing to update.

**Option A — Skip inside alerting.** Callers ask alerting to skip rules that did not change. Alerting defines "unchanged" once. Every caller uses that definition.

- Pros: The skip lives in one place. Callers delegate that check. They do not each write a different version.
- Cons: Additional complexity inside Alerting domain. That may not necessarily belong there. Alerting implementation may pick a meaning of "unchanged" for every caller, for example if `revision` changed, that is not faithful to that callers interpretation.

**Option B — Skip in the caller.** The caller removes unchanged rules. Then it calls `bulkUpdateRules`. Alerting writes every rule it receives.

- Pros: The caller usually have installed rules loaded in memory, since they are needed for existing logic like validations (if the rule exists for example). Each caller decides when and how rule updates should be skiped based on their own definition of "has it changed?".
- Cons: Potentially leads to multiple interpretations of the same problem. 

**We picked B.** Detection import already loads the installed rules. The skip belongs with that check to avoid loading the rule again for anoter check. Alerting stays "always write", like `updateRule`. Callers are not locked to one shared definition of "unchanged".
