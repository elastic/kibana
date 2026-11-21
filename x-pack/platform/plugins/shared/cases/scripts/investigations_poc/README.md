# Investigations POC scripts

Standalone Node ESM scripts (no dependencies, localhost only). Node: `$HOME/.nvm/versions/node/v24.22.3/bin`.

| Env var | Default | Purpose |
| --- | --- | --- |
| `KBN_URL` | `http://localhost:5602` | Kibana |
| `UIPOC_ES_URL` | `http://localhost:9201` | Elasticsearch |
| `KBN_AUTH` | `elastic:changeme` | `user:pass` for both |
| `MOCK_PORT` | `18555` | Mock model port (also used in the connector URL) |
| `DUMP_DIR` | unset | Mock writes each raw request to `req_<n>_<kind>.json` |

Note: the Elasticsearch URL is read from `UIPOC_ES_URL`, not `ES_URL`, because developer shells often export `ES_URL` for a different cluster.

## Setup (idempotent)

```sh
node setup.mjs
```

Waits for Kibana, then creates or updates: POC users (`braxton.w`, `priya.k`, `dana.r`, `marcus.r`, `aisha.l`, `jun.t` as superuser; `viewer.v` with role `uipoc_cases_read`), the `uipoc-mock-llm` connector, the default AI connector and agent chat settings, the `cases-investigation-agent` Agent Builder agent, and four investigation-type Cases templates (Malware, Phishing, Account compromise, Alert triage). All passwords are `changeme`.

If the investigation tools are not registered yet, the agent step prints a warning and reports `pending`. Re-run once Kibana has the tools.

### Investigation types

An investigation type is a Cases template (templates v2) of owner `securitySolution` tagged `investigation-type`; `GET /internal/cases/investigations/_types` lists them with their fields. Setup creates or updates (new template version) four of them. The names must stay `Malware`, `Phishing`, `Account compromise` and `Alert triage`, because the default procedure is picked by type name.

Every type has guidance (Markdown, display only), business unit (select), impact (text, required to close), data classification (select, required, default Internal), ticket (text, pattern `SEC-1234`) and root cause notes (textarea, 20 to 2,000 characters, required to close). On top of that:

| Type | Extra fields and rules |
|---|---|
| Malware | file hash (SHA-256 pattern), hosts affected (number 0 to 10,000), observed behaviors (checkbox group), containment done (toggle), contained at (date, shown and required only when containment done), remediation (select, required to close) |
| Phishing | sender (email pattern), reported at (date), affected users (number 0 to 100,000), link clicked (toggle), users who clicked (number, shown and required only when link clicked), credentials entered (radio), escalation contacts (user picker), mailbox purge (radio, required to close) |
| Account compromise | affected business units (checkbox group), data exfiltrated (radio), exfiltration volume (number, shown and required only when data exfiltrated is Yes), escalation contacts (user picker), credentials reset (radio, required to close) |
| Alert triage | alert count (number 1 to 100,000), reviewer (single user picker), tuning action (select, required to close) |

Records are created with `template_id` and `extended_fields` (Cases storage format: strings keyed `<name>_as_<type>`; toggles `"true"`/`"false"`, checkbox groups and user pickers as JSON array strings). Cases validates every rule. The record keeps a typed copy in `fields.<name>_<keyword|text|long|double|bool|date>` for queue filters, sorting and columns.

## Mock model

```sh
node mock_llm.mjs &
```

OpenAI-compatible, accepts POST on any path, streaming and non-streaming. Title and compaction calls get canned answers. Everything else is a stateless keyword script over the latest user text (the `<investigation_digest>` block is ignored for matching):

| Say | Tool called |
| --- | --- |
| `summarise` / `unresolved` / `what is open` | `investigation_read_items` (open and blocked claims) |
| `add an indicator <ip/hash/domain/url>` | `investigation_add_evidence` |
| `open a claim: <question>` / `raise a question` | `investigation_upsert_claim` |
| `settle/support/conclude/refute claim C3 using E1 E2 that <conclusion>` | `investigation_upsert_claim` |
| `mark task T2 as done` / `complete task "<title>"` | `investigation_set_task_status` |
| `propose` / `suggest an action` / `block <value>` (also isolate, collect) | `investigation_propose_action` |
| `add host\|user\|entity <name>` | `investigation_upsert_entity` |

After a tool result it always replies in text (no loops). Tool errors are echoed as `The tool reported an error: <message>`.

Introspection:

```sh
curl localhost:18555/_captured?n=20          # summaries: kind, raw_chars, est_tokens, roles, tools, digest_chars, latest user text
curl localhost:18555/_captured/last_raw      # last full request body
curl -XPOST localhost:18555/_reset
```

`lib/client.mjs` exports `KBN`, `ES`, `AUTH_HEADER`, `kbn`, `es`, `waitForKibana`, `sleep`, `log`, `parseArgs`, `sha256` and `uuidv5Like` for the seed, load-test and migration scripts.
