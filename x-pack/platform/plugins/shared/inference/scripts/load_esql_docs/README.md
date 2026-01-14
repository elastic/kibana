# Load ES|QL docs

This script loads ES|QL documentation from the `built-docs` repo, and rewrites it with help of the LLM.
The generated documentation is validated and will emit warnings when invalid queries have been generated.

## Requirements

- checked out `built-docs` repo in the same folder as the `kibana` repository
- a running Kibana instance
- an installed Generative AI connector

### Run script to generate ES|QL docs and verify syntax

To deterministically get the ES|QL docs from the built markdown files, without modification from LLMs, you can run:
```
node x-pack/platform/plugins/shared/inference/scripts/load_esql_docs/index.js

or

npx tsx x-pack/platform/plugins/shared/inference/scripts/generate_esql_docs/index.ts
```

To use an LLM to read the built docs, and then generate docs, you can pass in the connectorId.

```
npx tsx x-pack/platform/plugins/shared/inference/scripts/load_esql_docs/generate_esql_docs.ts --connectorId example-connector-id
```


### Checking syntax errors for generated files

After making modifications to fix the syntax error, and you just need to check if there any remaining errors left,you can run a script that reports.

```
node x-pack/platform/plugins/shared/inference/scripts/report_syntax_errors/index.js
```
