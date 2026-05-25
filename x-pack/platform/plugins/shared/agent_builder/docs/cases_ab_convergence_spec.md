# Cases / Agent Builder convergence specification

## Target state

- **Now (Option B):** Agent Builder **Project** wraps an existing Case (`type: 'case'`, `case_ref`, projected knowledge).
- **Later (Option A):** Case UI becomes a view on a `type=case` Project if product fit is proven.
- **Not in scope:** `ProjectCollection` hierarchy; sidebar grouping is `filter by type` only.

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
