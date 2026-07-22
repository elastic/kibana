# @kbn/evals-suite-alerting-v2

Evaluation suite for Alerting V2 agent skills, built on top of
[`@kbn/evals`](../kbn-evals/README.md). The first specs target the **rule-management**
skill; additional Alerting V2 skills can be added under `evals/`.

## Overview

The rule-management skill lets users compose, discover, and modify Alerting V2 rules and
action policies (notification policies) from within an Agent Builder conversation. It is
backed by two tools:

- `platform.alerting.manage_rule`
- `platform.alerting.manage_action_policy`

This suite drives the skill end-to-end through the `/api/agent_builder/converse` API and
asserts that natural-language requests route to the correct tool, and that the assistant's
response is correct.

For general information about writing evaluation tests, configuration, and usage, see the
main [`@kbn/evals` documentation](../kbn-evals/README.md).

## Prerequisites

- A configured AI connector (task model) and, ideally, a judge connector for the
  LLM-as-judge evaluators. See the
  [agent-builder suite README](../agent-builder/kbn-evals-suite-agent-builder/README.md)
  for connector and tracing setup details.
- Agent Builder enabled in your Kibana instance (the `alerting_v2` plugin registers the
  rule-management skill when `agentBuilder` is available).

## Running

```bash
# Interactive flow (starts services, prompts for model/judge)
node scripts/evals start --grep "rule management"

# Run directly against already-running services
node scripts/evals run --suite alerting-v2 --project <task-connector-id>

# Or via Playwright directly
node scripts/playwright test --config x-pack/platform/packages/shared/kbn-evals-suite-alerting-v2/playwright.config.ts
```
