# Draft comment for [search-team#14200](https://github.com/elastic/search-team/issues/14200) (Chat organisation)

Copy/paste into the GitHub issue (edit names/links as needed).

---

## Cases / Agent Builder convergence — alignment with program doc + Chat organisation

We are exploring **Cases + Agent Builder convergence** (case-centric AI workspace). A POC branch introduces an AB **`Project`** with `type: 'case'`, `case_ref`, projected case knowledge, and linked `conversation_ids`.

After reading the **Agent Builder program doc**, this POC targets the same primitive the doc describes under **Experience Principles (Jan 2026)**:

> **“Chat” as a project-like container** — interactions include the conversation plus metadata and **relations to other artifacts (e.g. connected cases, alerts, workflows)**. A “Chat” represents an **investigation project**.

That is the same bucket as this epic’s **“projects”** (P2; doc notes *“labels and pinning are v1; projects build on labels”*), not a separate Cases-only workspace.

### Terminology we are *not* duplicating

| Program doc term | Meaning | Cases POC |
|----------------|---------|-----------|
| **Agent Workspace** | Few, largely independent top-level workspaces | **Not** our `Project` SO |
| **Context Plugin/Package/Project** | Skills + Sources bundle for a use case | **Not** our `Project` SO (see `cases/SKILL.md` instead) |
| **Multi-user chat** (P0) | Shared conversation, attribution, group UX | [#14201](https://github.com/elastic/search-team/issues/14201) / [#259692](https://github.com/elastic/kibana/pull/259692) — **inside** a project, not instead of it |

### Proposed split

| Layer | Owner | What it is |
|-------|--------|------------|
| **Investigation container** (“Chat” / project) | #14200 + program doc | Persistent container: `type`, members, conversation list, persisted vs ephemeral attachments, relations (`case_ref`, alerts, workflows). |
| **Group thread** | #14201 / #259692 | Multi-user **conversation** (timeline, `@agent`, shared ACL). |
| **`ProjectType.case`** | Cases + AB | `case_ref { case_id, owner }`, knowledge projected from Case; case UI entry. **Does not** replace Case SO, connectors, or UserAction audit. |

### Illustrative shape

```
Investigation container (type=case, case_ref → Case)
├── Shared context (projected case knowledge — not re-attached every chat)
├── Group conversation(s)          ← P0 multi-user
└── Private / forked conversation(s) ← #14221
```

Human + AI activity that must appear on the **case audit trail** stays in the **Cases activity log**. AB threads are for agent collaboration grounded in the case.

### Asks

1. Confirm the canonical name going forward: **“Chat” (project-like)** vs **“Project”** in APIs/storage — we can rename the POC to match.
2. Is **`ProjectType.case` / `connected cases`** the right extension for Security/O11y case views, or should case linking live only as attachments until generic projects ship?
3. Treat `.chat-projects` POC index as **throwaway** until #14200 lands?

**Internal spec:** `x-pack/platform/plugins/shared/agent_builder/docs/cases_ab_convergence_spec.md` (Agent Builder roadmap alignment).

cc @chrisbmar @pgayvallet @deeptidheer-dotcom
