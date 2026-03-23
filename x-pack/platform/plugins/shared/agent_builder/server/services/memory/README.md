# Agent Builder Memory

A persistent, wiki-style knowledge base shared across all agents in a Kibana space. Memory accumulates domain knowledge over time through conversations, user edits, and automated discovery — enabling agents to become more knowledgeable and useful the more they're used.

## Concepts

### Memory Entries
Each entry is a markdown document at a **wiki path** (e.g., `architecture/web-frontend/overview`). Paths form a hierarchy, like a file system. Entries have:
- **Path**: unique hierarchical identifier
- **Title**: human-readable name
- **Content**: markdown body (full-text searchable)
- **Tags**: optional classification labels
- **Version**: auto-incrementing on every change

### Version History
Every change to an entry creates a version snapshot. You can:
- View the full history of any entry
- Compare any two versions
- Roll back to any previous version
- See who made each change (user or agent)

### Compaction Log
When multiple entries are restructured (merged, split, reorganized), the operation is recorded in a separate audit log for traceability.

---

## How to Use Memory

### As a User in the Chat UI

#### Reading memory
Ask the agent about what it knows:
- *"What do you know about the web-frontend service?"*
- *"Show me what's in memory about deployment procedures"*
- *"List everything in the architecture section"*

The agent will search memory and present relevant entries.

#### Writing to memory
Tell the agent to remember something:
- *"Remember that the API gateway has a 30-second timeout for upstream calls"*
- *"Save this runbook to memory under ops/runbooks/deploy-checklist"*
- *"Create a memory entry about our team's on-call rotation"*

The agent will ask for confirmation before writing.

#### Correcting memory
If memory contains wrong information:
- *"Memory says the timeout is 30s, but it's actually 60s — fix it"*
- *"The entry about web-frontend is outdated, the service was renamed to user-portal"*
- *"Delete the memory entry about the old authentication system"*

The agent searches for the relevant entry, makes a targeted edit (using `memory_patch`), and creates a version record.

#### Reviewing changes
- *"Who changed the deployment runbook last?"*
- *"Show me the history of the web-frontend overview"*
- *"Roll back the API gateway entry to version 3"*

### In the Memory UI (Agent Builder > Memory)

#### Browser View
- **Left panel**: collapsible tree of all memory entries organized by path
- **Right panel**: rendered markdown content of the selected entry
- **Search bar**: full-text search across all entries
- **Actions**: Create, Edit, Delete, Move entries

#### Entry Detail View
- View rendered markdown content
- **Edit**: open markdown editor
- **History tab**: chronological list of all versions with:
  - Timestamp
  - Author (user or `agent:<id>`)
  - Change summary
  - Diff view between versions
- **Rollback**: restore any previous version

#### History View
- Global activity log across all entries
- Filter by author, path, change type
- Compaction operations highlighted

---

## Agent Tools

Memory is exposed to agents via 6 built-in tools, designed for **token efficiency** (agents don't need to send/receive full documents for every operation):

### `memory_search`
Search memory by keywords. Returns **snippets only** (not full content).
```
Input:  { query, tags?, parent_path?, size? }
Output: [{ id, path, title, snippet, score, updated_at, updated_by }]
```

### `memory_read`
Read a specific entry with targeted access.
```
Input:  { path?, id?, heading?, offset?, limit? }
Output: { id, path, title, version, content, total_lines, returned_range, headings }
```
- **heading**: read only the section under a specific heading
- **offset/limit**: read a specific line range
- **headings**: always returned so the agent can navigate without reading everything

### `memory_write`
Create or overwrite an entry at a path.
```
Input:  { path, title, content, tags?, change_summary? }
Output: { id, path, version, created }
```
Requires user confirmation. Use for new entries or full rewrites.

### `memory_patch`
Apply surgical edits without sending the full document.
```
Input:  {
  path?, id?,
  operations: [{
    old_text?, new_text?,   // search-and-replace
    heading?, content?,     // replace section under heading
    append?,                // append to end or under heading
  }],
  change_summary
}
Output: { id, path, version, operations_applied }
```
Requires user confirmation. Supports batch operations.

### `memory_list`
Browse the wiki hierarchy. Returns metadata only.
```
Input:  { parent_path?, recursive? }
Output: [{ id, path, title, updated_at, updated_by, line_count }]
```

### `memory_delete`
Delete an entry (history preserved).
```
Input:  { id?, path? }
Output: { deleted, path }
```
Always requires user confirmation.

### Typical agent workflow: "Fix a fact"

1. `memory_search("API gateway timeout")` → finds entry, returns snippet
2. `memory_read(path: "architecture/api-gateway/overview", heading: "## Configuration")` → reads just the relevant section
3. `memory_patch(path: "...", operations: [{ old_text: "30-second timeout", new_text: "60-second timeout" }], change_summary: "Corrected timeout value")` → surgical edit

**Total token cost**: proportional to the edited section, not the entire knowledge base.

---

## Automatic Learning

### Periodic Learning (every N conversation rounds)
After every N rounds (default: 5), the system runs a background reflection:
1. Summarizes recent conversation rounds
2. Asks the LLM: "What new facts, corrections, or insights did you learn?"
3. Produces structured suggestions for memory updates
4. Presents them to the user for approval

### Significant Events Integration
When the agent discovers knowledge indicators from streams data (via `search_knowledge_indicators`):
1. Raw indicators are **synthesized** by the LLM into architectural understanding
2. The LLM produces prose descriptions: what services do, their behaviors, cross-service relationships
3. Proposed entries are stored under `architecture/<stream_name>/`
4. User reviews and approves before committing

This is **not** a raw dump of features — it's curated knowledge that improves over time.

### Context Injection
Before every agent turn, relevant memory entries are automatically searched based on the user's input and injected into the agent's context. The agent is instructed:
- To use memory tools when relevant
- To offer to fix memory when the user reports errors
- To offer to save noteworthy learnings

---

## Data Storage

Memory uses three Elasticsearch system indices (prefixed `.chat-`):

| Index | Purpose |
|-------|---------|
| `.chat-memory` | Current state of all memory entries |
| `.chat-memory-history` | Append-only version history |
| `.chat-memory-compaction-log` | Multi-entry restructuring audit log |

All indices are space-scoped. Memory is shared within a space but isolated between spaces.

---

## Permissions

Memory management is controlled by the `manageMemory` sub-feature privilege under Agent Builder. Users with this privilege can:
- Create, edit, delete, and move memory entries
- View version history and rollback
- Review compaction logs

Read access to memory (viewing entries, searching) requires the base Agent Builder read privilege.

---

## HTTP API

All routes are under `/api/agent_builder/memory/`:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/entries` | Create entry |
| GET | `/entries/:id` | Get entry by ID |
| GET | `/entries/by-path?path=...` | Get entry by path |
| PUT | `/entries/:id` | Update entry |
| DELETE | `/entries/:id` | Delete entry |
| POST | `/entries/:id/move` | Move/rename entry |
| POST | `/search` | Full-text search |
| GET | `/tree` | Get hierarchical tree |
| GET | `/entries/:id/history` | Get version history |
| GET | `/entries/:id/history/:version` | Get specific version |
| POST | `/entries/:id/rollback` | Rollback to version |
| GET | `/compaction-log` | Get compaction log |
