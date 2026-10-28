# ES|QL PromQL Queries

Query metrics data in Elasticsearch with Prometheus Query Language (PromQL) using the `PROMQL` source command.
Follow the `PROMQL` command documentation, including its best practices and limitations, and the guidelines below.

<!--
The command reference, best practices and unsupported constructs come from the PROMQL command docs in
Elasticsearch, synced to esql_docs/esql-promql.txt. Only add what those docs do not cover here.
To fix wrong or missing guidance on what PROMQL supports or how to write it, update the Elasticsearch documentation
and sync esql-promql.txt rather than editing this file.
Keep this file to guidance that is specific to the generate_esql tool.
-->

## When to use PROMQL

Use `PROMQL` only when the user asks for PromQL, provides a PromQL expression, or ports a Prometheus query, dashboard or alert.
In that case, use `PROMQL` even if the target supports `TS`. Otherwise, prefer `TS`.

## Metrics and labels

- Metric names are the metric field names of the target, e.g. `network.total_bytes_in`.
- Label names are the dimension fields of the target (`ts_dimension`), e.g. `cluster` or `host.name`.
- The metric type is the `ts_metric` of the field, e.g. `ts_metric=counter`.

## Guidelines

- **Only use the supported functions and aggregations.** Any function that is not in this list is not supported and fails the query: {{promql_functions}}.
- **Treat PromQL expressions in the request as the intent, not the final query.** They are often copied from Prometheus or written by the calling agent, so apply the `PROMQL` best practices to them.
- **When the request needs an unsupported construct**, tell the user, and only fall back to an equivalent `TS` query if the user did not require PromQL.
