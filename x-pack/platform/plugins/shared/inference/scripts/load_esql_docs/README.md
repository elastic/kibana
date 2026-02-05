# Load ES|QL docs

This script loads ES|QL documentation from the `built-docs` repo, and rewrites it with help of the LLM.
The generated documentation is validated and will emit warnings when invalid queries have been generated.

## Requirements

- a running Kibana instance
- an installed Generative AI connector

### Run
yarn es snapshot --license trial
node scripts/kibana --dev --no-base-path

## Incremental Updates

The script uses a hash-based caching mechanism to optimize performance. This means:
- Unchanged source files are skipped completely
- Only changed sections within a file are reprocessed
- The cache significantly reduces processing time when only a few files have changed

### Force Update All Files

To force the script to regenerate all files regardless of hash matches, use the `--force` flag:

```
node x-pack/platform/plugins/shared/inference/scripts/load_esql_docs/index.js --force
```

This is useful for:
- Testing the full generation pipeline
- Regenerating all files after changes to the processing logic
- Ensuring all files are up-to-date after cache corruption

### Run script to generate ES|QL docs and verify syntax

To deterministically get the ES|QL docs from the Elastic's documentation markdown files, without modification from LLMs, you can run:
```
node x-pack/platform/plugins/shared/inference/scripts/load_esql_docs/index.js
```

To connect to a connector/LLM to read the built docs and then enrich the extracted docs, you must first have an installed Generative AI connector. Then, pass in the connectorId. Enrichment involves explaining in natural language what the ES|QL examples are doing.

```
node x-pack/platform/plugins/shared/inference/scripts/load_esql_docs/index.js --connectorId example-connector-id
```

You can also combine flags:
```
node x-pack/platform/plugins/shared/inference/scripts/load_esql_docs/index.js --connectorId example-connector-id --force
```

### Checking syntax errors for generated files

After making modifications to fix the syntax error, and you just need to check if there any remaining errors left,you can run a script that reports.

```
node x-pack/platform/plugins/shared/inference/scripts/report_syntax_errors/index.js
```
