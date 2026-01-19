# Load ES|QL docs

This script loads ES|QL documentation from the `built-docs` repo, and rewrites it with help of the LLM.
The generated documentation is validated and will emit warnings when invalid queries have been generated.

## Requirements

- checked out `built-docs` repo in the same folder as the `kibana` repository
- a running Kibana instance
- an installed Generative AI connector

### Run script to generate ES|QL docs and verify syntax

```
node x-pack/platform/plugins/shared/inference/scripts/load_esql_docs/index.js
```

The script will also generate a report of syntax errors found during the generation process, located at
`x-pack/platform/plugins/shared/inference/server/tasks/nl_to_esql/esql_docs/__tmp__/syntax-errors.json`. This file will not be checked into git.

### Checking syntax errors for generated files

After making modifications to fix the syntax error, and you just need to check if there any remaining errors left,you can run a script that reports.

```
node x-pack/platform/plugins/shared/inference/scripts/report_syntax_errors/index.js
```
