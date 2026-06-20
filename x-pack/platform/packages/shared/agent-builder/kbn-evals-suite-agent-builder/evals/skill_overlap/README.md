# Skill Overlap Eval

Analyses every pair of registered agent builder skills for description overlap that could cause the agent to load the wrong skill. Each pair is evaluated by an LLM judge that checks for shared trigger phrases, ambiguous user messages, missing negative guidance, and content-level domain invasion. The results are reported as risk levels (`HIGH`, `MEDIUM`, `LOW`, `NONE`) with actionable recommendations.

Experimental skills (behind `agentBuilder:experimentalFeatures`) are automatically enabled during the eval so they are included in the pairwise analysis.

## Running

### 1. Initialise

Run the interactive setup to configure connectors and local vault config:

```bash
node scripts/evals init
```

### 2. Export connectors

Copy the `export` command printed by `init` and run it:

```bash
export KIBANA_TESTING_AI_CONNECTORS=<output from init>
```

### 3. Start the eval

```bash
node scripts/evals start --suite agent-builder --judge eis-anthropic-claude-4-6-sonnet --model eis-anthropic-claude-4-6-sonnet --datasets-profile none --grep "Skill Overlap"
```

`--datasets-profile none` skips dataset loading (this eval only uses the live skill catalog). `--grep "Skill Overlap"` restricts the run to this eval suite.

## Single-model execution

This eval analyses skill descriptions — it doesn't exercise the task model. To avoid redundant LLM calls when multiple connectors are configured, the spec skips all projects except the one matching the judge (`evaluationConnector`). Set `--model` to the same connector as `--judge`.
