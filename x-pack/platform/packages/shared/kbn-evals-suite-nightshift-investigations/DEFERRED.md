# Deferred local telemetry

Generated restricted local Elasticsearch identity, telemetry connector, basic-auth manifest support and tests. The synthetic trace-only runner supplies its own evidence and does not need these changes. Adapt to the current sandbox contracts when resuming.

Source: `b656789f07c89379c2d82deb34636f262138fdc5`; base: `b0a6c50cf43447489e6f93aa4820105f0732c3e8`. Original complete snapshot: `nightshift/archive-291002-b656789f`. Preserved for follow-up; not validated on this extracted branch. Historical validation is in PR #291002 before its scope rewrite. None of this branch is required for task 1 of deductive-ai/deductive#10565.

## Historical implementation notes


The `evals_nightshift_investigations` Scout config extends `evals_tracing`. It adds the plugin,
sandbox, a preconfigured basic-auth telemetry webhook, Agent Builder experimental features,
and the two tracing/privacy settings that `evals_tracing` does not already set, so all eight are
on. Both trace exporters use the selected profile.
The telemetry connector uses a generated file-realm identity on the ephemeral Scout cluster.
It can only read and inspect index metadata for `logs-*`, `metrics-*`, and `traces-*`; it has
no cluster, write, impersonation, or restricted-index privileges. Its random password is
kept in the same private Kibana configuration, and Elasticsearch receives only its salted hash.
Existing preconfigured-only,
agent allow-list and execute-authorization checks still apply.

