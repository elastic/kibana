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
asserts that natural-language requests route to the correct skill/tools, and that composed
attachments and assistant responses are correct.

For the shared evals CLI, profiles, and CI labels, see the main
[`@kbn/evals` documentation](../kbn-evals/README.md).

## Prerequisites

- **Docker** running (the evals CLI starts an EDOT collector container).
- **Vault CLI** with OIDC access to `https://secrets.elastic.co:8200` (needed for EIS model
  discovery and EIS Cloud Connected Mode / CCM).
- Repo bootstrapped (`yarn kbn bootstrap`) in a Kibana checkout.
- Agent Builder + Alerting V2 enabled for the Scout server config set `evals_alerting_v2`
  (the suite registration wires this; you do not need to hand-edit `kibana.dev.yml` for the
  standard `evals start` flow).

## Running locally

### 1. Vault login

EIS connector discovery and CCM read secrets from Vault:

```bash
export VAULT_ADDR=https://secrets.elastic.co:8200
vault login -method=oidc
```

If CCM calls start failing with an invalid API key after a fresh login, clear the local
cache so it is re-fetched:

```bash
rm -f ~/.elastic/eis-ccm-key.json
```

### 2. First-time connector init (once per machine)

On the first run, either let `evals start` walk you through setup interactively, or run:

```bash
node scripts/evals init
```

That discovers EIS models (writes `~/.elastic/eis-connectors-cache.json`) and creates
`x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.local.json` when using a
local profile.

### 3. Start the suite

Preferred one-shot flow (starts EDOT + Scout + EIS CCM, then runs Playwright):

```bash
# Full suite
node scripts/evals start --suite alerting-v2 --judge eis-google-gemini-3-1-pro

# Filter by Playwright test title
node scripts/evals start --suite alerting-v2 --grep "routing" --judge eis-google-gemini-3-1-pro

# Specific task model(s)
node scripts/evals start --suite alerting-v2 \
  --model eis-openai-gpt-5-2 \
  --judge eis-google-gemini-3-1-pro
```

Useful flags:

| Flag | Purpose |
| --- | --- |
| `--suite alerting-v2` | This suite (id in `evals.suites.json`) |
| `--model <id>` | Task model connector (comma-separated for multi-model) |
| `--judge <id>` | LLM-as-judge connector for Criteria |
| `--grep <pattern>` | Filter tests by title |
| `--skip-server` | Reuse an already-running Scout/EDOT stack |
| `--skip-init` | Skip interactive connector/config prompts |
| `--repetitions <n>` | Repeat each example N times |

### 4. Unit tests (no Vault / Scout)

```bash
node scripts/jest x-pack/platform/packages/shared/kbn-evals-suite-alerting-v2
```

## Spec layout

- `evals/rule_management/rule_management.spec.ts` — skill routing + rule composition
- `evals/rule_management/action_policy.spec.ts` — notification / action-policy flow

Example ground truth lives entirely under `output` (skills, tools, attachments, criteria).
Evaluators receive that object as `expected`. Omit a field to skip the matching scorer.

Low-score evaluator failures log the Playwright **test title** plus conversation transcript
for triage (see `src/evaluator_utils.ts`).
