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

Waits for Kibana, then creates or updates: POC users (`braxton.w`, `priya.k`, `dana.r`, `marcus.r`, `aisha.l`, `jun.t` as superuser; `viewer.v` with role `uipoc_cases_read`), the `uipoc-mock-llm` connector, the default AI connector and agent chat settings, the `cases-investigation-agent` Agent Builder agent, four investigation-type Cases templates (Malware, Phishing, Account compromise, Alert triage), the statuses and pause reasons, and a saved Phishing task list. All passwords are `changeme`.

### Statuses, pause reasons and the Phishing task list

- `PUT /internal/cases/investigations/_statuses`: setup reads the current configuration first and keeps every existing key (a status can only be disabled, never removed). The built-ins stay the defaults, "Waiting on the employee" (`waiting_on_the_employee`, in progress, pauses time tracking) is enabled, and every other custom status (for example `on_hold`) ends up disabled. Pause reasons are the Cases defaults (`DEFAULT_CASE_PAUSE_REASONS`) plus "Waiting on the employee's reply".
- `PUT /internal/cases/investigations/_procedure_templates/<template_id>`: setup saves one task list for the Phishing type (based on `DEFAULT_PROCEDURE_TEMPLATES.Phishing`) with a `priority` and `due_within` on every task and one task with `subtasks`.
- A custom close reason ("Resolved and remediated") is written to the Security Solution advanced setting `securitySolution:detectionsCloseReasons`; the Cases close route accepts only the Cases defaults and reasons configured there. The setting is sensitive, so setup overwrites the whole list.
- The statuses and task-list steps compare with what is stored and report `unchanged` on a re-run.

If the investigation tools are not registered yet, the agent step prints a warning and reports `pending`. Re-run once Kibana has the tools.

### Investigation types

An investigation type is a Cases template (templates v2) of owner `securitySolution` tagged `investigation-type`; `GET /internal/cases/investigations/_types` lists them with their fields. Setup creates or updates (new template version) four of them. The names must stay `Malware`, `Phishing`, `Account compromise` and `Alert triage`, because the default procedure is picked by type name.

Every type has guidance (Markdown, display only), business unit (select), impact (text, required to close), data classification (select, required, default Internal), ticket (text, pattern `SEC-1234`) and root cause notes (textarea, up to 2,000 characters, required to close). On top of that:

| Type | Extra fields and rules |
|---|---|
| Malware | file hash (SHA-256 pattern), hosts affected (number 0 to 10,000), observed behaviors (checkbox group), containment done (toggle), contained at (date, shown and required only when containment done), containment notes (textarea, 20 to 2,000 characters, shown and required only when containment done), remediation (select, required to close) |
| Phishing | sender (email pattern), reported at (date), affected users (number 0 to 100,000), link clicked (toggle), users who clicked (number, shown and required only when link clicked), credentials entered (radio), escalation contacts (user picker), mailbox purge (radio, required to close) |
| Account compromise | affected business units (checkbox group), data exfiltrated (radio), exfiltration volume (number, shown and required only when data exfiltrated is Yes), escalation contacts (user picker), credentials reset (radio, required to close) |
| Alert triage | alert count (number 1 to 100,000), reviewer (single user picker), tuning action (select, required to close) |

Records are created with `template_id` and `extended_fields` (Cases storage format: strings keyed `<name>_as_<type>`; toggles `"true"`/`"false"`, checkbox groups and user pickers as JSON array strings). Cases validates every rule. The record keeps a typed copy in `fields.<name>_<keyword|text|long|double|bool|date>` for queue filters, sorting and columns.

## Seeds (`node seed.mjs --scenario A|B|C|D|E|all [--clean]`)

Five scenarios (INV-226 A, INV-218 B, INV-240 C, INV-1187 D, INV-0991 E). Run `node setup.mjs` first. Records use the Cases shape:

- Priority only (the case severity); no record `severity`.
- Tasks: status `open | in_progress | completed | cancelled` (a cancelled task carries `cancel_reason`), a `priority`, `assignees` (profile uids), some `due_date` values (INV-218, INV-240 and INV-1187 each have an open task that is overdue) and one subtask each in INV-218 and INV-240.
- Closes use `close_reason` (Cases values `true_positive`, `false_positive`, `benign_positive`, plus the custom reason "Resolved and remediated" on one related record) and the optional `summary`; close-required template fields are passed as `extended_fields` on the close. Verdicts use the Cases values (`true_positive`, `false_positive`, `benign_positive`, `suspicious`, `undetermined`).
- Record-level discussion is case comments (`POST .../comments`), posted as the seeded person with basic auth (`reply_to` for replies). Comments on tasks, evidence and claims stay items. Comment times are the time of seeding: the comments route cannot be backdated.
- INV-240 (scenario C, AI off, Phishing) shows the Cases path: template fields with rules filled, six case comments from three people including two replies, two assignees, and the custom status "Waiting on the employee" with the pause reason "Waiting on the employee's reply" (set last, with a backdated `ts`). It is also pushed once to the fake ticketing system (see below), so it shows an external incident.

- Access and links: every record is created with `access: { mode: 'default' }` (the seeds, `load.mjs` and the migration). The old `restricted_to` list is gone. A record restricted with `PATCH` `{ access: { mode: 'restricted' } }` adds the caller to the case assignees; only assignees can open it (404 for everyone else) and it leaves the queue for them. No seed is restricted (INV-0991 only carries the "SOX, restricted" classification field), and no seed links two records; link them with `POST /internal/cases/investigations/<id>/links { other_id }`.

`node load.mjs --records N --items M` and `node load.mjs --clean` use the same shapes (records without `severity`, tasks `open` with a priority). `migrate_agentic_investigations.mjs` writes `priority` from the legacy severity and closes with a Cases `close_reason` and `human_verdict`.

## Ticket server and the ticketing connector

`ticket_server.mjs` is a tiny fake ticketing system on `http://127.0.0.1:9300` (`--port` or `UIPOC_TICKETS_PORT` to change it; tickets are kept in `$TMPDIR/uipoc_tickets.json`, override with `UIPOC_TICKETS_FILE`). Start it with `node ticket_server.mjs &` before seeding or using push.

| Request | Meaning |
| --- | --- |
| `POST /tickets` | create (Cases push) |
| `GET /tickets/:id` | read the ticket (Cases push, Sync) |
| `PUT /tickets/:id` | update (Cases push) |
| `POST /tickets/:id/comments` | comment (Cases pushes unpushed comments on each push) |
| `GET /tickets/:id/view` | HTML ticket page, the link Kibana shows |
| `PATCH /tickets/:id` `{title?, description?, status?: open\|in_progress\|closed}` | an edit made in the ticketing system, to try Sync |
| `GET /tickets` | list |

`node setup.mjs` creates the Cases Webhook connector `uipoc-tickets` ("UIPOC Ticketing") that points at it, and removes hand-made duplicates with the same name. It is a normal Cases connector: pick it in the **External incident** section of the Context panel (or in a classic case), then **Push as UIPOC Ticketing incident**. The investigation uses Cases' own push, so `GET /api/cases/<case_id>` shows the same `external_service`.

Push, automatic push and sync (the investigation routes `GET|PUT {base}/{id}/external_ticket`, `POST .../external_ticket/_push`, `POST .../external_ticket/_sync`):

- **Update incident** appears when Cases says the case changed since the push. A push also sends comments that were not pushed yet.
- **Push changes automatically** pushes a title, description, tags, comment or status change a few seconds after it is made (3 s debounce per record). It only keeps an incident that already exists up to date.
- **Sync from UIPOC Ticketing** reads the ticket and applies what changed in it since the last push or sync: a changed title and description (the ticket wins), and a new status (`in_progress` moves an open record to in progress, `open` moves it back, `closed` closes it with the close reason "Other"; required tasks or fields that block the close leave the record open and the Activity entry says why). Tags and comments are only pushed. Nothing a sync pulls is pushed back, and the sync writes one Activity entry "Synced from UIPOC Ticketing: ..." with origin `connector`.
- Not built: an inbound notification endpoint (the ticket system calling Kibana), a per-field direction editor, field mappings, and the per-type fields of Jira, ServiceNow, Resilient and Swimlane connectors (only connectors without fields, such as Cases Webhook, are set up from the investigation).

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
| `mark task T2 as completed` (or `done`) / `complete task "<title>"` | `investigation_set_task_status` (status `completed`) |
| `cancel task T2 because <reason>` | `investigation_set_task_status` (status `cancelled`, with `cancel_reason`) |
| `propose` / `suggest an action` / `block <value>` (also isolate, collect) | `investigation_propose_action` |
| `add host\|user\|entity <name>` | `investigation_upsert_entity` |

Indicator types are Cases observable type keys (`observable-type-ipv4`, `observable-type-file-hash`, ... plus custom types from the Cases configuration). The mock still sends the old short names (`ip`, `file_hash`, `url`, `domain`); the server accepts them as aliases (`ip` becomes IPv4 or IPv6 from the value), so the mock needs no change.

After a tool result it always replies in text (no loops). Tool errors are echoed as `The tool reported an error: <message>`.

Introspection:

```sh
curl localhost:18555/_captured?n=20          # summaries: kind, raw_chars, est_tokens, roles, tools, digest_chars, latest user text
curl localhost:18555/_captured/last_raw      # last full request body
curl -XPOST localhost:18555/_reset
```

`lib/client.mjs` exports `KBN`, `ES`, `AUTH_HEADER`, `kbn`, `es`, `waitForKibana`, `sleep`, `log`, `parseArgs`, `sha256` and `uuidv5Like` for the seed, load-test and migration scripts.
