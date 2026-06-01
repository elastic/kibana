# Inbox demo

Local-dev fixtures for exercising the Inbox + Workflows integration end to end.

## What's here

- `workflows/01_string_input.yml` … `workflows/06_required_with_defaults.yml`
six minimal workflows, one per field-type case from
[security-team#16707](https://github.com/elastic/security-team/issues/16707):
string, number, boolean, single-select enum, multi-select array of enum,
and required + defaults.
- `workflows/07_hitl_single_approval.yml`, `08_hitl_two_step_approval.yml`, `09_hitl_nested_agent.yml` —
three HITL end-to-end scenarios: a single-step approval gate, a two-step approval chain (the
canonical example for the CAS race walkthrough), and a nested `ai.agent` step that propagates
`WAITING_FOR_INPUT` upward. These are the primary fixtures for verifying cross-surface
concurrency safety across Agent Builder, Inbox, and the Workflows execution view.
- `seed_inbox_demo.ts` — Imports each workflow into a running Kibana and
triggers a manual run so they pause on `waitForInput` and surface in the
Inbox.

For the full HITL architecture and a step-by-step walkthrough of the two-step approval race these demos exercise, see the [HITL deep-dive — Walkthrough](/x-pack/platform/packages/shared/workflows/hitl-common/README.md#walkthrough-two-step-approval-race).

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

Open `/app/inbox` to see the seeded items, click "Respond" on each, and
exercise the schema-driven flyout.