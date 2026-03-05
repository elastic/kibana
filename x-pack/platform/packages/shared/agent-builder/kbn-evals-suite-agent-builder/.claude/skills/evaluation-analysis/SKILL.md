---
name: evaluation-analysis
description: Compare agent-builder evaluation runs with paired statistical tests — fetch scores from ES with PIT pagination, run Wilcoxon for numeric families and exact McNemar for binary metrics, compute family-appropriate effect sizes and bootstrap CIs, apply Holm correction, and produce summary outputs.
allowed-tools: Bash, Read
argument-hint: <baseline-run-id> [variant-run-id-1 ...] [--label <run-id>=<name> ...]
---

# Evaluation Analysis

Compare a baseline evaluation run against one or more variant runs using metric-type-aware statistical tests. Produces p-values, effect sizes, confidence intervals, Holm-corrected significance, and visualizations.

The user's arguments are: **$ARGUMENTS**

---

## Skill Files

This skill uses checked-in files for consistency and reproducibility:

- `scripts/eval_analysis.py` — main analysis runner
- `scripts/chart_style.py` — shared chart styling (palette, theme, figure defaults)
- `scripts/requirements.txt` — Python dependencies
- `reference/statistical-contract.md` — primary/supplementary inference contract
- `reference/chart-spec.md` — chart purposes and interpretation

Prefer running these files directly instead of generating ad-hoc scripts in `/tmp`.

---

## Step 1: Parse arguments

- Require at least two positional run IDs from `$ARGUMENTS`: baseline first, then one or more variants.
- If fewer than two run IDs are provided, ask the user for baseline + variant IDs.
- Then **use the `AskUserQuestion` tool** to ask the user — do not proceed to Step 2 until the user responds:

> Would you like to provide short descriptive names for the run IDs? These will be used in charts and tables instead of the raw run IDs for readability (e.g. "baseline-gpt5.2", "variant-claude-sonnet-4.6"). Format: `<run-id>=<label>` for each.

  Present two options: "Yes, I'll provide labels" and "No, use short run IDs (first 8 chars)". **Wait for the user's answer before continuing.**

- Optional display names use repeatable flags: `--label <run-id>=<display-name>`.
- If the user declines, the script automatically falls back to the first 8 chars of each run ID.

---

## Step 2: Resolve Elasticsearch URL

1. Use `EVALUATIONS_ES_URL` when set.
2. Otherwise probe:
   - `http://elastic:changeme@localhost:9200`
   - `http://elastic:changeme@localhost:9220`

Health check command:

```bash
curl -s -o /dev/null -w "%{http_code}" "http://elastic:changeme@localhost:9200/_cluster/health"
```

If neither endpoint returns `200`, stop and report:

> Cannot connect to Elasticsearch. Please ensure ES is running and set `EVALUATIONS_ES_URL` if using a non-default URL (tried localhost:9200 and localhost:9220).

---

## Step 3: Validate run IDs

Check each run ID with `_count` before running analysis:

```bash
curl -s -X POST "${ES_URL}/kibana-evaluations/_count" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": { "term": { "run_id": "REPLACE_RUN_ID" } }
  }'
```

If any run has `count = 0`, stop and report:

> No scores found for run ID `<run-id>`. Verify the run ID is correct and that scores were exported to this Elasticsearch cluster.

---

## Step 4: Install dependencies

**Important:** With pyenv, `pip install` may fail with `pyenv: cannot rehash` if the shell is sandboxed. If this happens, re-run with filesystem write permissions outside the workspace (e.g. request the `all` permission).

```bash
pip install -r "x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/.claude/skills/evaluation-analysis/scripts/requirements.txt" --quiet 2>/dev/null || \
pip3 install -r "x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/.claude/skills/evaluation-analysis/scripts/requirements.txt" --quiet 2>/dev/null
```

---

## Step 5: Run the analysis

The script performs PIT pagination, repetition aggregation, paired testing, effect sizes, Holm correction, and chart/summary output.

```bash
python3 "x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/.claude/skills/evaluation-analysis/scripts/eval_analysis.py" \
  ./stats-output "${ES_URL}" "<baseline_run_id>" "<variant1_run_id>" [... more variants ...] \
  [--alpha <alpha>] \
  --label "<baseline_run_id>=<baseline_label>" --label "<variant1_run_id>=<variant1_label>" [...]
```

Metric classification is driven by `KNOWN_METRICS` plus RAG prefix matching (`Precision@`, `Recall@`, `F1@`) in `eval_analysis.py`.

- `Numeric` -> Wilcoxon signed-rank + `r_rb`
- `Binary` -> exact McNemar + `OR`
- `Excluded` -> skipped

Optional env overrides:

```bash
export EVAL_METRIC_DISPLAY_LABEL_MAP_JSON='{"My Custom Evaluator":"LLM Quality"}'
export EVAL_METRIC_TEST_CATEGORY_MAP_JSON='{"My Custom Evaluator":"Numeric"}'
export EVAL_EXCLUDE_EVALUATORS='Metric A,Metric B'
```

`EVAL_METRIC_TEST_CATEGORY_MAP_JSON` values must be one of: `Numeric`, `Binary`, `Excluded`.

If execution fails, surface the full error and stop.

---

## Step 6: Report results

After success:

1. Print the markdown summary table from stdout.
2. Report output directory: `./stats-output/YYYY-MM-DD_HH-MM-SS/`.
3. List generated files (`summary.md`, `results.json`, and PNG charts).
4. Call out significant results using the configured alpha (`holm_p < alpha`, default `0.05` unless `--alpha` is set).
5. Call out large effects (`|r_rb| >= 0.5` or `max(OR, 1/OR) >= 4.3`).
6. Warn on insufficient data (`N < 6`).
7. Clarify that the 95% CI column is for numeric metrics; binary rows show `n/a`.

---

## Step 7: Optional interpretation references

- `reference/statistical-contract.md`
- `reference/chart-spec.md`

---

## Important Notes

- Elasticsearch must contain `kibana-evaluations` score documents for the requested runs.
- Python 3 + pip are required.
- Multiple variants are compared independently against the baseline in one invocation.
- Do not use `node scripts/evals compare`; this skill supersedes it.
