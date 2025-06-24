# Load ES|QL docs

This script loads ES|QL documentation from the `built-docs` repo, and rewrites it with help of the LLM.
The generated documentation is validated and will emit warnings when invalid queries have been generated.

## Requirements

- checked out `built-docs` repo in the same folder as the `kibana` repository
- a running Kibana instance
- an installed Generative AI connector
