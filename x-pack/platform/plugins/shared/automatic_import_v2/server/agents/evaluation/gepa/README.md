# GEPA optimizer for Automatic Import V2 prompts

- **evaluator.py**: `evaluate(candidate, example)` — calls Kibana evaluate API, compares pipeline output to `expected_outputs`, returns score and ASI.
- **run_optimization.py**: Loads golden data, runs `gepa.optimize_anything` in generalization mode, writes best prompt to `optimized_prompt.json`.
- **seed_prompts.json**: Seed candidate (e.g. `INGEST_PIPELINE_GENERATOR_PROMPT`). Refresh from TypeScript via `node export_seed_prompts.js`.
- **config.py**: Reads `KIBANA_URL`, `GEPA_CONNECTOR_ID` from env (and `.env` in this directory).
- **Reflection LM**: GEPA uses a second LLM to propose prompt edits. Default is Bedrock (`GEPA_REFLECTION_MODEL=bedrock/us.anthropic.claude-sonnet-4-5-20250929-v1:0`). Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION_NAME` for Bedrock, or set `GEPA_REFLECTION_MODEL` to another LiteLLM model (e.g. `openai/gpt-4o`) and the corresponding API key.

See [../README.md](../README.md) for full setup and usage.
