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
