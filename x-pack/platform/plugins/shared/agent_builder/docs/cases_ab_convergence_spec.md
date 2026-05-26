# Cases / Agent Builder convergence specification

## Target state

- **Now (Option B):** Agent Builder **Project** wraps an existing Case (`type: 'case'`, `case_ref`, projected knowledge).
- **Later (Option A):** Case UI becomes a view on a `type=case` Project if product fit is proven.
- **Not in scope:** `ProjectCollection` hierarchy; sidebar grouping is `filter by type` only.

## Agent Builder roadmap alignment

Source: **Agent Builder program doc** (Google Doc / `Agent Builder.docx`) + GitHub epics under [search-team#14069](https://github.com/elastic/search-team/issues/14069).

Cases/AB convergence **must not introduce a parallel container model**. The program doc already defines a **chat-as-investigation-project** primitive with explicit **connected cases**; the POC `Project` type should converge to that, not to unrelated “project” names in the stack.

### Terminology map (avoid duplicate concepts)

| Program doc concept | Priority (doc) | POC / Cases term | Relationship |
|---------------------|----------------|------------------|--------------|
| **Chat as a project-like container** — conversation + metadata + relations to **connected cases, alerts, workflows**; investigation handoff / reuse | Experience principles (Jan 2026) | `Project` / `type=case` + `case_ref` | **Primary alignment.** Cases integration is a first-class relation on the container, not a separate product. |
| **Chat organization — projects** (after labels & pinning) | P2 — “labels and pinning are v1; **projects build on labels**” | `ProjectType` + sidebar `filter by type` | Same intent as [search-team#14200](https://github.com/elastic/search-team/issues/14200). Case-typed projects are one flavour. |
| **Chat based container** — history, context, metadata; shareable | Core components | One or more **conversations** listed on a project | Conversations are threads; the container holds many + persisted attachments policy. |
| **Collaboration: Multi-user chat** | **P0** | Group conversations inside a project | [search-team#14201](https://github.com/elastic/search-team/issues/14201), [#259692](https://github.com/elastic/kibana/pull/259692) — see [pr_259692_multi_user_dependency.md](./pr_259692_multi_user_dependency.md) |
| **Agent Workspace** | Core components (few, independent) | **Not** the POC `Project` SO | Higher-level scope (e.g. space/deployment grouping). Do not overload case linking into “workspace”. |
| **Context Plugin/Package/Project** | Core components | **Not** the POC `Project` SO | Means **Skills + Sources** bundle for a use case (`kibana-best-practices/cases/SKILL.md`, etc.). |
| **Non-collaborative sharing (read-only)** | Backlog | Fork / duplicate conversation | [search-team#14221](https://github.com/elastic/search-team/issues/14221) — handoff, not the same as group chat. |
| Cross **Project** Search | Separate initiative | N/A | [search-team#14234](https://github.com/elastic/search-team/issues/14234) — Elasticsearch CPS only. |

### Duplication verdict

| Question | Answer |
|----------|--------|
| Is “AB Project” duplicative of the program roadmap? | **Yes — it is the same planned capability**, named “Chat” / “projects” in the doc and #14200, not a Cases-only invention. |
| Is Cases `case_ref` duplicative? | **No — it is called out** (“connected cases”) as a relation on the investigation container. |
| Is multi-user chat duplicative of Projects? | **No — complementary.** P0 multi-user is at **conversation** level; the container groups threads and shared knowledge. |
| Is Option A (`case.project` on Case SO) in the doc? | **Not as canonical storage.** Doc centres the **chat container** with case **relations**. Prefer container + `case_ref` unless Cases team requires SO co-location for connectors/audit. |

### Division of responsibility

- **AB Chat organisation (#14200):** labels → pins → **projects**; generic container (title, `type`, members, `conversation_ids`). `ProjectType`: `case`, `hunt`, `investigation`, `general` in `@kbn/agent-builder-common`.
- **AB Multi-user (#14201 / #259692):** timeline, group ACL, `@agent` trigger, attribution / audit questions in doc UC2.
- **Cases/AB convergence:** `ProjectType.case`, `case_ref`, knowledge projection, case UI entry (Add to Chat → AI Workspace), persisted AI via Cases UserAction when required for audit.

### Sequencing note (from program doc)

Multi-user chat is **P0**; chat organisation projects are **P2** (after labels/pins). The case-linking POC may run **ahead of generic project UX** — treat `.chat-projects` as spike-only until #14200 schema/UX is agreed.

**Coordination:** `#ws-chat-experience-ux` (Chris Martin, Pierre Gayvallet, Deepti).

Draft GitHub comment for #14200: [cases_ab_chat_org_issue_comment_draft.md](./cases_ab_chat_org_issue_comment_draft.md).

## Team ownership

| Area | Owner |
|------|--------|
| Case SO, user actions, connectors, push-to-service | `@elastic/kibana-cases` |
| Project SO, conversations, agent execution | `@elastic/workchat-eng` |
| Security case attachment + Add to Chat entry | Security Solution + Cases UI |
| Platform case attachment | `agent_builder_platform` |

## AI persistence (default until changed)

- **Phase 1–2:** AI replies are **chat-only** (Agent Builder conversation rounds).
- **Phase 3:** Opt-in **persisted** AI comments via `cases.ai_response` unified attachment + UserAction (audit on case).

## Trigger policy (Phase 3)

1. **Manual:** Add to Chat / user sends message in case-linked conversation.
2. **Mention (future):** `@agent` in case comment text triggers agent run.
3. **Event-driven (future):** New alert attached to case → optional auto-summary (feature-flagged).

## RBAC

- Case access: existing Cases `owner` + feature privileges.
- Project/conversation access: `agentBuilder:read` / `agentBuilder:write` + conversation owner (shared ACL when [PR #259692](https://github.com/elastic/kibana/pull/259692) lands).
- Project `members` mirror case assignees at create time; membership sync is best-effort on project get.

## Citation model

- Neither Cases comments nor AB `AssistantResponse` use Elastic Assistant `contentReferences` today.
- Rich citations: **versioned AB attachments** + Cases unified attachment `metadata` on `ai_response` (Phase 3).

## Elastic Assistant

- Security case flows should **not** assume EA `PRIVATE|RESTRICTED|SHARED` or anonymization; those are EA-only.
- Deprecation of EA for case-centric flows is a separate program decision.

## API surfaces (implemented)

| API | Purpose |
|-----|---------|
| `security.case` / `platform.core.cases.case` attachment | Case context in chat |
| `POST /api/agent_builder/projects` | Create project (incl. from case) |
| `GET/PATCH /api/agent_builder/projects/{id}` | Project CRUD |
| `conversation.case_id` / `project_id` | Link chat to case/project |
| Cases UI Add to Chat | Opens AB with case attachment |

## Multi-user dependency

See [pr_259692_multi_user_dependency.md](./pr_259692_multi_user_dependency.md).
