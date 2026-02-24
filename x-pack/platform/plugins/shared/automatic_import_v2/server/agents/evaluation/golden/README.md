# Golden dataset for GEPA prompt evaluation

This directory holds golden examples used to evaluate and optimize Automatic Import V2 agent prompts via [GEPA](https://github.com/gepa-ai/gepa) (optimize_anything).

## Schema

Each example is a JSON file (or one object in a combined file) with:

- **id** (string): Unique example/integration id.
- **input_logs** (string[]): One log entry per element. Each string is the raw content for one document (the pipeline receives `message: <string>`). Same format for .log and JSON sources; see below.
- **expected_outputs** (object[]): Expected document `_source` after the pipeline runs (one object per input log, same order). These are the outputs of `ingest.simulate()` for each doc.
- **source_format** (optional string): Hint for how the example was built: `"lines"` | `"ndjson"` | `"json_array"`. Not required for evaluation.

See `golden_example.schema.json` for the full JSON schema.

## .log vs JSON input

The API and evaluator always use **one string per log entry** in `input_logs`. How you get there depends on the source:

- **.log file (plain text):** Split the file into one entry per line (or per multi-line block if you use a delimiter). Each line/block is one element of `input_logs`. `expected_outputs` has one object per entry.
- **NDJSON (one JSON object per line):** One line = one entry. Split by newline; each line is one element of `input_logs`. The pipeline will typically use the `json` processor on that string.
- **JSON array (single file with `[{ ... }, ...]`):** One array element = one entry. For each element, use `JSON.stringify(item)` (or the original NDJSON line if you saved it that way) and put it in `input_logs`.

The pipeline generator infers format from the sample content; you do not need to tag it unless you are building tooling that converts .log or JSON files into golden JSON.

## Train/validation split

- **manifest.json** lists which example ids are used for **train** and **val**.
- GEPA uses `dataset=trainset` and `valset=valset` in generalization mode; validation score measures generalization to unseen integrations.

## Expected output format and comparison

- **expected_outputs** are structured JSON objects (expected `_source`), not raw log lines.
- Comparison in the evaluator can be **strict** (equality of keys and values) or **relaxed** (e.g. ignore `@timestamp`, or require only that expected keys match). Document your choice in the Python evaluator and keep it consistent.
- Pipeline output may add fields (e.g. `message` with the raw string). For scoring, common approaches:
  - Require that every key in `expected_outputs[i]` exists in the actual output with the same value.
  - Or require exact equality of a defined subset of fields.

## Adding examples

### From an integrations test pair (.log + .log-expected.json)

If you have an integrations pipeline test (e.g. `test-asa-fix.log` and `test-asa-fix.log-expected.json`), use:

```bash
# From kibana repo root (expected path defaults to <logpath>-expected.json)
node x-pack/platform/plugins/shared/automatic_import_v2/server/agents/evaluation/golden/log_and_expected_to_golden.js \
  /path/to/integrations/.../test-asa-fix.log

# Or with both paths
node .../golden/log_and_expected_to_golden.js path/to/file.log path/to/file.log-expected.json
```

This produces a golden example with `input_logs` from the .log and `expected_outputs` from the `expected` array in the -expected.json file. Then add the example `id` to `manifest.json`.

### From a raw .log file only

Use the helper script to turn a plain-text log file into a golden example (one line = one log entry, minimal `expected_outputs` with `message`):

```bash
# From repo root (writes to golden/<name>.json; id = filename without extension)
node x-pack/platform/plugins/shared/automatic_import_v2/server/agents/evaluation/golden/log_to_golden.js path/to/your/file.log

# Custom id
node .../golden/log_to_golden.js path/to/file.log --id=example-citrix

# Custom output path
node .../golden/log_to_golden.js path/to/file.log --out=golden/example-citrix.json
```

Then add the example `id` to `manifest.json` under `train` or `val`. You can edit the generated JSON to add more fields to `expected_outputs` for stricter evaluation.

### Manual

1. Add a new JSON file (e.g. `my-integration.json`) with `id`, `input_logs`, and `expected_outputs`.
2. Add the `id` to either `train` or `val` in `manifest.json`.

## Usage

- The Python GEPA script loads examples from this directory (or from a path you configure), parses `manifest.json` for train/val split, and passes each example to the evaluator when calling `optimize_anything`.
