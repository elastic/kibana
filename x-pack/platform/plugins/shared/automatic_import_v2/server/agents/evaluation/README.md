# GEPA prompt optimization for Automatic Import V2

This directory contains the **golden dataset** and **Python GEPA optimizer** for automatically improving Automatic Import V2 agent prompts so that generated pipelines better match expected outputs and generalize to unseen integrations.

## Getting started (checklist)

1. **Start Kibana** (with Elasticsearch and the Automatic Import V2 plugin). Ensure you have an **inference connector** (e.g. OpenAI / Elastic inference) and note its **connector ID** (from Stack Management → Connectors).

2. **Prepare golden data** in [golden/](golden/):
   - Add at least one example JSON (see [golden/README.md](golden/README.md)) with `id`, `input_logs` (array of raw log strings), and `expected_outputs` (array of expected `_source` objects).
   - List example ids in [golden/manifest.json](golden/manifest.json) under `train` (and optionally `val`). The repo includes `example-ndjson.json` and `example-syslog.json`; ensure their ids are in the manifest.

3. **Optional: refresh seed prompt** from TypeScript (from repo root):
   ```bash
   node x-pack/platform/plugins/shared/automatic_import_v2/server/agents/evaluation/gepa/export_seed_prompts.js
   ```
   Or edit [gepa/seed_prompts.json](gepa/seed_prompts.json) and set `INGEST_PIPELINE_GENERATOR_PROMPT` to your starting prompt.

4. **Set environment and run the optimizer**:
   ```bash
   export KIBANA_URL=http://localhost:5601
   export GEPA_CONNECTOR_ID=your-connector-id
   # If Kibana requires auth (e.g. API key):
   # export GEPA_AUTH_HEADERS='{"Authorization": "Bearer YOUR_API_KEY"}'

   cd x-pack/platform/plugins/shared/automatic_import_v2/server/agents/evaluation/gepa
   pip install -r requirements.txt
   python run_optimization.py
   ```
   The script calls the Kibana evaluate API for each (candidate, example), runs GEPA, and writes the best prompt to `gepa/optimized_prompt.json`.

5. **Apply the result**: Copy `INGEST_PIPELINE_GENERATOR_PROMPT` from `gepa/optimized_prompt.json` into [server/agents/prompts.ts](../prompts.ts) after review.

## Overview

- **Golden dataset** ([golden/](golden/)): Input log samples and expected pipeline outputs per example; train/val split for generalization.
- **Evaluation API**: Kibana exposes `POST /internal/automatic_import_v2/evaluate` (samples + optional prompt overrides) and returns the generated pipeline and simulation results.
- **Python GEPA** ([gepa/](gepa/)): Evaluator that calls the Kibana API and scores candidates; `run_optimization.py` runs `optimize_anything` in generalization mode and writes the best prompt to `optimized_prompt.json`.

## Prerequisites

- **Kibana + Elasticsearch** running (e.g. locally or in Docker), with an **inference connector** configured (connector ID required for the evaluate API and GEPA).
- **Python 3** with `gepa` and `requests` (see [gepa/requirements.txt](gepa/requirements.txt)).

## Golden dataset

See [golden/README.md](golden/README.md) for:

- Schema: `id`, `input_logs`, `expected_outputs`.
- Train/val split via `manifest.json`.
- Comparison rules (relaxed: expected keys must match in actual output).

## Evaluation API

- **Path**: `POST /internal/automatic_import_v2/evaluate`
- **Body**: `{ "samples": string[], "connectorId": string, "promptOverrides": Record<string, string>? }`
- **Response**: `{ current_pipeline, pipeline_generation_results, pipeline_validation_results }`
- **Auth**: Same as other Automatic Import V2 internal APIs (e.g. manage privilege). Use the same base URL and auth (cookie or API key) when calling from the GEPA evaluator.
- **Synchronous**: The route runs the full agent (orchestrator → pipeline generator → validator) and returns only when done. The request can take several minutes for large sample sets. The Python evaluator uses a 10-minute timeout by default (`GEPA_EVALUATE_TIMEOUT=600`); increase it if you hit timeouts.

## Running GEPA optimization

1. **Export seed prompt** (optional, to refresh from TypeScript):
   ```bash
   node x-pack/platform/plugins/shared/automatic_import_v2/server/agents/evaluation/gepa/export_seed_prompts.js
   ```
   This reads `INGEST_PIPELINE_GENERATOR_PROMPT` from `prompts.ts` and writes [gepa/seed_prompts.json](gepa/seed_prompts.json). Alternatively, copy the prompt from [prompts.ts](../prompts.ts) into `seed_prompts.json` under the key `INGEST_PIPELINE_GENERATOR_PROMPT`.

2. **Set environment**:
   ```bash
   export KIBANA_URL=http://localhost:5601
   export GEPA_CONNECTOR_ID=your-inference-connector-id
   ```
   If Kibana requires auth, set `GEPA_AUTH_HEADERS` to a JSON object string, e.g. `'{"Authorization": "Bearer <token>"}'`, and use it in the evaluator (see [gepa/evaluator.py](gepa/evaluator.py)).

   **Reflection LM (prompt improvement step):** GEPA uses a second LLM to propose prompt edits. By default the script uses **Bedrock** (`bedrock/us.anthropic.claude-sonnet-4-5-20250929-v1:0`). Set AWS credentials so LiteLLM can call Bedrock:
   ```bash
   export AWS_ACCESS_KEY_ID=your-access-key
   export AWS_SECRET_ACCESS_KEY=your-secret-key
   export AWS_REGION_NAME=us-east-1
   ```
   Or use another provider by setting `GEPA_REFLECTION_MODEL` to a [LiteLLM model string](https://docs.litellm.ai/docs/providers) (e.g. `openai/gpt-4o` with `OPENAI_API_KEY` set).

3. **Install Python deps and run**:
   ```bash
   cd x-pack/platform/plugins/shared/automatic_import_v2/server/agents/evaluation/gepa
   pip install -r requirements.txt
   python run_optimization.py
   ```
   The script loads train/val from [golden/manifest.json](golden/manifest.json), runs GEPA in generalization mode, and writes the best candidate to `gepa/optimized_prompt.json`.

4. **Apply the optimized prompt**: Copy the value of `INGEST_PIPELINE_GENERATOR_PROMPT` from `optimized_prompt.json` into [../prompts.ts](../prompts.ts) after review.

## Comparison rules (evaluator)

The Python evaluator uses **relaxed** matching: for each document, every key in `expected_outputs[i]` must exist in the actual pipeline output with the same value; `@timestamp` and `error` are ignored. This is defined in [gepa/evaluator.py](gepa/evaluator.py) (`_doc_match` with `relaxed=True`).

## Why is my score always 0.0?

The score is the fraction of **expected** documents that match the **actual** pipeline output. It is 0.0 when either:

1. **No successful pipeline outputs**  
   `pipeline_generation_results` is empty. That happens when:
   - The agent never runs the **validate_ingest_pipeline** tool, or
   - The pipeline fails or drops every sample (all docs error or are dropped).  
   Check `pipeline_validation_results` in the evaluator’s side_info (or GEPA logs): `success_rate`, `failed_samples`, `failure_details`. If `success_rate` is 0 or `actual_outputs_count` is 0, the pipeline isn’t producing any successful docs for the evaluator to compare.

2. **Outputs exist but don’t match expected**  
   The pipeline runs and produces docs, but the evaluator’s relaxed match finds missing or different fields (e.g. different ECS field names, timestamp format, or structure). Inspect `failures` in side_info: each entry has `expected` vs `actual` for the first few mismatches.

**What to do:** Ensure the agent is generating a pipeline and calling the validator with your samples. If validation always fails, fix the pipeline or the seed prompt so that at least some samples pass; then the evaluator can score matches. For strict golden data, expected_outputs should match the exact shape/values your target pipeline produces (e.g. from an integrations test).

## Cost and reproducibility

- Each GEPA metric call runs a full agent workflow (logs analysis → pipeline generation → ECS → append). Use a small train/val set and `max_metric_calls` (e.g. 50) to start; enable `cache_evaluation=True` (already set in `run_optimization.py`).
- Pin the GEPA version in [gepa/requirements.txt](gepa/requirements.txt) and document the Kibana/plugin version used for runs.
