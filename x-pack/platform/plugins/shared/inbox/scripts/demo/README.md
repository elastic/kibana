# Inbox demo

Local-dev fixtures for exercising the Inbox + Workflows integration end to end.

## What's here

- `workflows/01_string_input.yml` … `workflows/06_required_with_defaults.yml`
six minimal workflows, one per field-type case from
[security-team#16707](https://github.com/elastic/security-team/issues/16707):
string, number, boolean, single-select enum, multi-select array of enum,
and required + defaults.
- `workflows/07_multi_hitl.yml` — two-stage HITL chain (severity ->
isolation approval) on a single workflow run; exercises the inbox
history's continuity across multiple responses on one run.
- `workflows/08_short_timeout.yml` — workflow with a 30s
`settings.timeout` so the run cancels itself if no human responds.
Surfaces the abnormal-settle ("Timed out") badge in the audit feed.
- `seed_inbox_demo.ts` — Imports each workflow into a running Kibana and
triggers a manual run so they pause on `waitForInput` and surface in the
Inbox. Pass `--respond` to additionally auto-respond to the seeded rows
with mixed approve/reject payloads and rotating channel tags so the
inbox-history audit feed has rows to render. The `08_short_timeout`
workflow is intentionally left pending so the timeout fires and
populates an abnormal-settle history row.

## Pre-reqs

Enable the Inbox plugin in `kibana.dev.yml`:

```yaml
xpack.inbox.enabled: true
```

Start Kibana + ES locally (`yarn start --no-base-path`).

## Run

There are two equivalent ways to seed the demo data — pick whichever fits your workflow.

### Option A — From the `elastic-security` MCP (recommended for customers)

If you already have the `[elastic-security` MCP app](https://github.com/elastic/example-mcp-app-security)
configured, just call its `generate-inbox-data` tool. The MCP imports the
same six workflows in-process, so customers can stand up an Inbox demo
without cloning Kibana or running this script directly.

### Option B — From this repo

```bash
node --import tsx x-pack/platform/plugins/shared/inbox/scripts/demo/seed_inbox_demo.ts
```

Override defaults via env:

```bash
KIBANA_URL=http://localhost:5601 \
  KIBANA_USERNAME=elastic \
  KIBANA_PASSWORD=changeme \
  KIBANA_SPACE_ID=default \
  node --import tsx x-pack/platform/plugins/shared/inbox/scripts/demo/seed_inbox_demo.ts
```

> If you run Kibana with a base path (e.g. `yarn start` without
> `--no-base-path`, which mounts everything under `/kbn`), include
> the base path in `KIBANA_URL`:
>
> ```bash
> KIBANA_URL=http://localhost:5601/kbn \
>   node --import tsx x-pack/platform/plugins/shared/inbox/scripts/demo/seed_inbox_demo.ts --respond
> ```

Open `/app/inbox` to see the seeded items, click "Respond" on each, and
exercise the schema-driven flyout.

To additionally populate the inbox-history audit feed with a mix of
approved/rejected rows and per-channel badges (and a timed-out row
once the 30s timeout fires), add `--respond`:

```bash
node --import tsx x-pack/platform/plugins/shared/inbox/scripts/demo/seed_inbox_demo.ts --respond
```