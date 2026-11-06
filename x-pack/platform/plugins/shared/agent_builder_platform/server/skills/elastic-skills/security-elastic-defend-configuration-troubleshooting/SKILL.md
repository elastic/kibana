---
name: security-elastic-defend-configuration-troubleshooting
description: >
  Diagnose Elastic Defend configuration and endpoint issues with Automatic Troubleshooting. Use for unhealthy, offline,
  missing or non-reporting hosts; policy failures or sync; protection updates; integration or package errors; enrollment
  or check-ins; isolation or response actions; incompatible antivirus; output or event-shipping failures; and endpoint
  artifact questions, including exceptions, trusted apps or devices, event filters, host isolation exceptions and
  blocklists, unexpected allow or block behavior, or alerts despite exceptions.
metadata:
  author: security-defend-workflows
  version: 0.1.1
  visibility: internal
  universal: true
experimental: false
compatibility: >
  Kibana with Agent Builder and Workflows, the three Automatic Troubleshooting workflows installed and enabled, and the
  Workflows execute privilege. The skill is read-only: it runs the workflows and searches host data, and creates,
  changes or audits nothing.
uiSettingRequired: securitySolution:defendConfigurationTroubleshootingUniversalSkill
---

# Elastic Defend Configuration Troubleshooting

Automatic Troubleshooting diagnoses and resolves Elastic Defend configuration issues on endpoints. It is read-only: it
runs three read-only workflows and searches host data, and it never creates, changes or audits anything.

<!-- begin-partial: preamble -->

## Environment Configuration

This skill runs inside Agent Builder, bound to the Elastic deployment that serves the current conversation. Routing and
credentials are already handled: never ask the user for a URL, an API key, or any other credential, and do not shell out
to the `elastic` CLI.

Reach the Elasticsearch and Kibana HTTP APIs through the built-in API tools:

- `discover_apis` — find an operation's `api` identifier for a `target` of `elasticsearch` or `kibana`.
- `describe_api` — inspect the parameters that operation accepts.
- `execute_api` — run it, passing every value as a flat `params` map.

This skill references operations in HTTP-shorthand form (e.g., `GET /`, `GET /_cat/indices`, `POST /_query`). Translate
each one into an `execute_api` call rather than a CLI command: a bare path is a `target` of `elasticsearch`, and a
`kbn:` prefix is a `target` of `kibana`. The [Operations](#operations) table at the end of this document exists for
runtimes that drive the `elastic` CLI; ignore its CLI column here and use the API tools instead.

Prefer parameters that narrow a response (a filter, a `size` or `per_page` limit, an explicit field selection) because
oversized results are truncated before you see them.

<!-- end-partial: preamble -->

## When to use this skill

Use this skill when the user mentions any of these:

- "Elastic Defend" configuration failures, errors, or policy not applying
- Endpoint troubleshooting or diagnostics
- Endpoint or Defend hosts that are unhealthy, degraded, warning, failing, or not applying policy
- Endpoint not showing up, not reporting, or missing from the endpoint list
- Policy response failure, warning, or error
- Elastic Defend integration errors or warnings
- Incompatible antivirus software on endpoints
- Agent enrollment or check-in problems related to Elastic Defend
- Endpoint protection not applying or not updating
- Protection artifacts, artifact snapshots, global artifacts, manifest versions, or protection updates
- Elastic Defend package errors, warnings, or install failures
- Endpoint isolation, response action, or policy sync issues
- Endpoint exceptions, trusted apps, trusted devices, event filters, blocklists, or host isolation exceptions not
  working as expected
- Security alerts or events still appearing despite a configured endpoint exception or allowlist
- Unexpected allow or block behavior on endpoints
- Elastic Defend's own output or event-shipping failures — the endpoint's Logstash, Kafka, or Elasticsearch output
  dropping or rejecting endpoint events or alerts (for example "message size too large", output connectivity or SSL
  handshake errors), or an endpoint going degraded because of its output. This covers only Elastic Defend's endpoint
  output layer, not general-purpose Logstash, Kafka pipeline, or cluster troubleshooting.

## Tool rule

- Reach Kibana host, package, artifact and workflow-run routes only through `platform.core.execute_workflow` with the
  three workflow ids below. Never send those routes to `execute_api`, and do not use `discover_apis` for them.
- Run the workflows by id only, with `waitForCompletion: true`. Never execute inline workflow YAML, and never retry a
  failed workflow call with inline YAML or `execute_api`.
- Search host data only for the index patterns listed in [available_indices](references/available_indices.md), with the
  search operations in the [Operations](#operations) table.
- This skill declares no tools. It never persists findings: there is no insight step.

## Workflows

The three Automatic Troubleshooting workflows are internal: they are reached only by id, never by authoring or editing a
workflow. Call each through `platform.core.execute_workflow`:

```text
platform.core.execute_workflow
{
  "workflowId": "system-security-endpoint-configuration-troubleshooting-diagnose",
  "inputs": { "hostname": "<hostname>" },
  "waitForCompletion": true
}
```

### Diagnose — `system-security-endpoint-configuration-troubleshooting-diagnose`

Collects the fixed evidence for one Elastic Defend host, or for the environment when no host is given. Inputs:

- `hostname` — hostname of the Elastic Defend host to diagnose. Omit it, together with `agent_id`, to diagnose the
  environment without a target.
- `agent_id` — Fleet agent id or Endpoint id of the host to diagnose. When you have both an `agent_id` and a `hostname`
  for a host, pass the `agent_id`.
- `include_configurations` — boolean, default false. Read the current transform, index and pipeline configuration.
  Always on when no host is given.

The output is one diagnosis object:

| Field              | Content                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `target`           | the resolved host record, or `null`                                                                              |
| `candidates`       | candidate host records, when the name matched more than one host                                                 |
| `truncation`       | `total`, `returned`, `truncated` — set when the candidate list was cut                                           |
| `agent`            | the Fleet agent state: `status`, `last_checkin`, and the agent `components` with their units, status and message |
| `policy_response`  | the newest policy response: `Endpoint.policy.applied.status` and `actions[]` with `name`, `status`, `message`    |
| `health`           | `state` (`policy_failure`, `non_policy_failure`, `undetermined`, `healthy`) and `reasons`                        |
| `package_status`   | `package` with `installationInfo.version` and `latestVersion`, `stale`, and `configurations`                     |
| `inventory_counts` | `fleet_agent_count`, `united_metadata_count`, `current_metadata_count`                                           |
| `caveats`          | caveat tokens, see [Caveats](#caveats)                                                                           |

The target and candidate records carry `agent_id`, `endpoint_id`, `host_status`, `last_checkin`, `metadata` (with
`host.hostname` and `Endpoint.policy.applied.id`, `.name` and `.status`), and `fleet_agent` (with `status`,
`last_checkin` and `local_metadata.host.hostname`). A record without `metadata` is Fleet-only: the host is enrolled in
Fleet but has no endpoint metadata.

### Knowledge search — `system-security-endpoint-configuration-troubleshooting-knowledge-search`

Searches the Elastic Defend integration knowledge base. Inputs: `query` (required) — the question or evidence terms;
`max` — 1 to 10 excerpts, default 5. Output: `available`, and `results[]` with `filename`, `version` and `excerpt`.
Build the query from the user's terms and the concrete evidence, as in
[knowledge_queries](references/knowledge_queries.md).

### Find artifacts — `system-security-endpoint-configuration-troubleshooting-find-artifacts`

Reads one artifact list. Inputs: `list_id` (required — see the type map below), `search`, `policy_id`, `os` (`windows`,
`macos` or `linux`), `limit` — 1 to 20, default 10. Output: `summaries[]`, `population` (`fetched`, `total`,
`truncated`) and `unauthorized`.

### execute_workflow errors

Match the error text, print the sentence, then stop. Never retry with inline YAML or `execute_api`.

| Error text                                                                                   | Sentence, then stop                                                                                                              |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `Workflow with id "…" not found.`                                                            | Automatic Troubleshooting workflows are not installed in this deployment.                                                        |
| `Unauthorized to execute workflow. The 'workflowsManagement' execute privilege is required.` | Your role cannot run workflows, which Automatic Troubleshooting needs. Ask an administrator for the Workflows execute privilege. |
| `Workflow '…' is disabled and cannot be executed.`                                           | The Automatic Troubleshooting workflow is disabled in this deployment. An administrator can enable it in Workflows.              |
| The execution is not found after the wait (timeout).                                         | The diagnosis did not finish in time. Try again in a moment.                                                                     |

## Routing

In the table, diagnose, knowledge-search and find-artifacts stand for the three workflow ids above. Check the request
rows from top to bottom: the first match decides the first calls, so a more specific request wins. When a request
matches more than one row:

- A request that reports a host missing from the endpoint list wins over an artifact symptom: the missing-endpoint rule
  answers the primary ask.
- A missing-from-list request, an artifact symptom, and a health or symptom report on a host each win over a
  configuration question; the skill then answers the configuration part from `package_status.configurations`, with
  `include_configurations: true` on that diagnose.
- The "after" rows apply to each diagnose result.

| Request                                                                                                                                                                                                                                                              | First calls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create, change, audit or check the deployment of an artifact                                                                                                                                                                                                         | The fixed refusal only. Run no workflow.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| An artifact symptom — alerts still fire, an unexpected allow or block, events missing, an isolated host cannot reach a destination, or device access — with or without a named artifact type, when the request does not report a host missing from the endpoint list | With a named host: diagnose with the host, then find-artifacts for the symptom's types with `policy_id` = `target.metadata.Endpoint.policy.applied.id` when present (the filter then returns global and that policy's items). When that diagnose returns `target_not_found`, do not run find-artifacts: give the not-found sentence and ask the user to check the host name. Without a host: find-artifacts for the symptom's types, with no policy filter; when the request also asks about transforms, index settings or pipelines, also diagnose without a host (configurations on) and answer that part from `package_status.configurations`. A `healthy` diagnosis does not end this path: classify it `OTHER_CURRENT_ISSUE`, still run find-artifacts, and do not ask for a symptom. Then the "after" rows apply; without a host, knowledge-search with the symptom terms. |
| List or show artifacts of a named type, with no symptom                                                                                                                                                                                                              | find-artifacts only, with that type's `list_id`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| A configuration question with no host (transforms, index settings, pipelines), when it is not a missing-from-list request                                                                                                                                            | knowledge-search with the question's terms first, then diagnose without a host (configurations on).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Endpoints missing from the endpoint list, with no named host                                                                                                                                                                                                         | diagnose without a host (configurations and counts on), then the missing-endpoint rule, then knowledge-search with "endpoint missing from endpoint list".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| A named host is missing from the endpoint list                                                                                                                                                                                                                       | diagnose with the host and `include_configurations: true`, then the missing-endpoint rule, then one knowledge-search with "endpoint missing from endpoint list" and the host facts. This search replaces the knowledge call of the "after" rows for this request.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| A configuration question about a named host (transforms, index settings, pipelines), when it is not a missing-from-list request, an artifact symptom, or a health or symptom report                                                                                  | knowledge-search with the question's terms first, then diagnose with the host and `include_configurations: true`, then answer from `package_status.configurations` and that search, with the host's health state as context. No `CURRENTLY_HEALTHY` short answer and no second knowledge call: this search replaces the knowledge call of the "after" rows for this request.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| A named host: health, policy, or another symptom on the host                                                                                                                                                                                                         | diagnose with the host (`include_configurations: true` when the request also asks about transforms, index settings or pipelines).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| After diagnose of a named host: `CURRENT_POLICY_FAILURE`, `NON_POLICY_HEALTH_FAILURE` with at least one reason other than `host_updating` or `component_transitional`, or `OTHER_CURRENT_ISSUE`                                                                      | knowledge-search with the current evidence terms.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| After diagnose: `RECOVERED_POLICY_FAILURE`, `CURRENTLY_HEALTHY`, or `NON_POLICY_HEALTH_FAILURE` whose only reasons are `host_updating` or `component_transitional`                                                                                                   | No knowledge search. For the temporary case, no restart or policy remediation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| After `target_ambiguous`, the user picks a candidate                                                                                                                                                                                                                 | diagnose with that candidate's `agent_id`, not the hostname, and with the original row's `include_configurations` value (`true` for a missing-from-list or host configuration request), then continue the original request's row: for a missing-from-list request, the missing-endpoint rule and its single knowledge search; for a host configuration request, that row's answer with no second knowledge call; for an artifact symptom, find-artifacts for the symptom's types with the picked target's `policy_id` (find does not run while the target is ambiguous), then the "after" rows; otherwise its health class.                                                                                                                                                                                                                                                      |

## Endpoints missing from the endpoint list

Never name a cause from a difference between counts: the counts cover different sets of hosts, so a difference alone
does not show why a host is missing. Report facts only.

### Counts

Report only the counts that are present — an unread count is absent and has its caveat — each with what it covers:

- `fleet_agent_count` — Elastic Defend agents with `active: true` (enrolled, not unenrolled), which includes agents
  whose status is inactive or uninstalled. It covers this space when Fleet space awareness is on, and every space when
  it is off.
- `united_metadata_count` — the hosts on this space's Endpoint list: active agents with both an agent document and
  endpoint metadata, without the placeholder agent ids.
- `current_metadata_count` — current endpoint metadata documents of the Elastic Defend agents in this space, including
  unenrolled agents that the Endpoint list excludes.

### Transforms

Report each `package_status.configurations.transforms[]` row with `failing: true`, with its `id`, `state` and `reason`,
stated as a fact that can stop hosts from reaching the list. For the row whose `id` starts with
`endpoint.metadata_united-default`, when present, also report `stats.documents_processed`; report `frequency`,
`sync.time.delay` and `settings.max_page_search_size` only when neither `unauthorized:package_configurations` nor
`unavailable:package_configurations` is present.

### Named host

- A resolved record with `metadata`: the host is on the Endpoint list. Say so and ask what the user sees.
- A Fleet-only record (no `metadata`): say "{hostname} is in Fleet but has no endpoint metadata on the Endpoint list",
  with its `host_status` and `last_checkin`. When `fleet_agent.status` is `unenrolled`, also say that an unenrolled host
  is not shown on the list. When it is `uninstalled`, say that Fleet reports the Elastic Agent as uninstalled, and do
  not give that as the reason for the missing list entry — `host_status` cannot tell the two states apart.
- `target_not_found`: print the not-found caveat sentence.

With no named host, end by asking which host is missing, then diagnose it by the named-host routing row. Use the
knowledge-search results only as documentation of possible causes, never as a conclusion drawn from the counts.

## Artifacts

### Type map

| Artifact type             | `list_id`                            |
| ------------------------- | ------------------------------------ |
| Endpoint exceptions       | `endpoint_list`                      |
| Trusted applications      | `endpoint_trusted_apps`              |
| Trusted devices           | `endpoint_trusted_devices`           |
| Event filters             | `endpoint_event_filters`             |
| Host isolation exceptions | `endpoint_host_isolation_exceptions` |
| Blocklist                 | `endpoint_blocklists`                |

### Symptom types

When a symptom names no artifact type, search these lists:

| Symptom                                     | `list_id` values                               |
| ------------------------------------------- | ---------------------------------------------- |
| Still alerting, or a false positive         | `endpoint_list`, `endpoint_trusted_apps`       |
| Allowed or blocked when it should not be    | `endpoint_blocklists`, `endpoint_trusted_apps` |
| Events missing                              | `endpoint_event_filters`                       |
| An isolated host cannot reach a destination | `endpoint_host_isolation_exceptions`           |
| Device access                               | `endpoint_trusted_devices`                     |
| Unclear                                     | All six, with `limit: 5`                       |

### Rendered fields

Render an item from the projected `summaries` only, and only these fields: the name, the OS, the scope, and the entries
summary. The scope reads `policy_scope`: say "global" when `policy_scope.kind` is `all`; say "not assigned to any
policy" when it is `unassigned`; otherwise list the `policy_scope.policy_ids`, followed by "and
{policy_scope.policy_ids_total - policy_ids.length} more" when `policy_scope.policy_ids_total` is present — the find
output has no policy names.

### Unauthorized lists

When the find output has `unauthorized: true`, print "I cannot read the {type} list, because your role does not have
access to endpoint artifacts." (with the artifact type) and do not say that the list is empty.

### Fixed refusal

Answer every request to create, change, audit or check the deployment of an endpoint artifact with this sentence only,
and run no workflow:

```text
Creating, changing or auditing endpoint artifacts is not available in this skill. You can manage them on the Endpoint artifact pages in Security > Manage: Endpoint exceptions, Trusted applications, Trusted devices, Event filters, Host isolation exceptions and Blocklist.
```

## Classification

`health.state` gives the class:

- `policy_failure` — `CURRENT_POLICY_FAILURE`. The failing action names, statuses and messages from
  `policy_response.Endpoint.policy.applied.actions` are the primary symptom.
- `non_policy_failure` — `NON_POLICY_HEALTH_FAILURE`. When its only `health.reasons` are `host_updating` or
  `component_transitional`, say that the host or the Elastic Defend component is in a temporary state, name the status,
  and ask the user to check again in a few minutes; do not call it a failure.
- `healthy` — when the user named a symptom beyond general health (an alert, an exception, allow or block behavior,
  performance, a crash, or a past time that is not about a policy failure), classify `OTHER_CURRENT_ISSUE`. Otherwise —
  including a question about a past policy failure or warning, for example "why was it failing yesterday" — run one
  search of `metrics-endpoint.policy-*` scoped to the target (`agent.id` = the target's `endpoint_id`), newest 5 by
  `event.created`, keeping `@timestamp`, `Endpoint.policy.applied.status` and `Endpoint.policy.applied.actions`: any
  older non-success gives `RECOVERED_POLICY_FAILURE`; otherwise `CURRENTLY_HEALTHY`.
- `undetermined` — a partial diagnosis, not a confirmed healthy state or policy failure. Explain the missing evidence:
  `agent_components_unread` means the Elastic Agent component health could not be read; `endpoint_component_missing`
  means the agent was read but has no Elastic Defend component. Call knowledge-search only when the user's symptom is
  separately `OTHER_CURRENT_ISSUE`.

For `RECOVERED_POLICY_FAILURE`, run no knowledge search. The answer says "The endpoint appears recovered." and mentions
the older warning, its `@timestamp` and the non-success action names, only as historical context. `OTHER_CURRENT_ISSUE`
stays a judgment class: gather the smallest current evidence, then knowledge-search with the concrete symptom terms.

## Caveats

The diagnosis carries caveat tokens. Print the sentence for each token that has one, exactly as written;
`target_ambiguous` has no sentence — the candidate list is the message.

### `target_not_found`

`{name}` is the value the lookup used: the `agent_id` input when one was given, else the `hostname` input. An agent id
does not get around space filtering, so the sentence does not suggest it:

```text
I could not find an Elastic Defend host that matches "{name}" in this space. Check the name, and check that the host is managed in this space.
```

### `host_unenrolled`

`{host}` is `target.metadata.host.hostname`, or `target.fleet_agent.local_metadata.host.hostname` for a Fleet-only
record, else `target.agent_id`. `{state}` is "uninstalled" when `target.fleet_agent.status` is `uninstalled`, else
"unenrolled from Fleet":

```text
The Elastic Agent on {host} is {state}, so the host no longer receives policy updates or sends health status.
```

### `unauthorized:<part>` and `unavailable:<part>`

Treat unavailable evidence as missing, not proof that the host does not exist. This also applies when host resolution
returns unavailable because the Fleet name search stopped at its page limit.

`{part label}` and `{privilege}` come from the part table:

```text
I could not read {part label}, because your role does not have {privilege}.
I could not read {part label} because of an error, so this part of the diagnosis is missing.
```

| Part                       | Part label                                         | Privilege                                                                     |
| -------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| `host_state`               | the endpoint host details                          | Security read                                                                 |
| `host_enrollments`         | the Fleet enrollment records of this host          | Fleet agents read                                                             |
| `agent_components`         | the Elastic Agent component health                 | Fleet agents read                                                             |
| `policy_response`          | the endpoint policy response                       | Security read                                                                 |
| `package_freshness`        | the Elastic Defend integration version             | Security read or Fleet integrations read                                      |
| `package_configurations`   | the current transform, index and pipeline settings | cluster monitor and read access to `metrics-endpoint.metadata*`               |
| `package_default_settings` | the default transform settings of the integration  | Fleet integrations read                                                       |
| `fleet_agent_count`        | the Fleet agent count                              | Fleet integrations read, or Elastic Defend policy management or artifact read |
| `united_metadata_count`    | the Endpoint list count                            | Security read                                                                 |
| `current_metadata_count`   | the count of the current metadata index            | read access to `metrics-endpoint.metadata_current_*`                          |

## Rendering

- Print the caveat sentence for each caveat token that has one. Never fill an unauthorized or unavailable field from
  search results.
- For a missing-endpoint request, apply the missing-endpoint rule with its count wording, and skip index settings and
  the transform configuration fields (`frequency`, `sync.time.delay`, `settings.max_page_search_size`) when
  `unauthorized:package_configurations` or `unavailable:package_configurations` is present.
- For `target_ambiguous`, list the candidates' hostname (`metadata.host.hostname`, or
  `fleet_agent.local_metadata.host.hostname`), `agent_id`, `host_status` and `last_checkin`, and ask the user to choose.
  Only for `target_ambiguous`, when `truncation.truncated` is true, first say "At least {truncation.total} hosts match
  this name; I show {truncation.returned}." and ask for a more specific hostname or the `agent_id` if the host is not in
  the list.
- For a find result where `summaries.length` is less than `population.total`, print "Showing {n} of {population.total}
  {type}." after the list, with `{n}` = `summaries.length`, so a list cut by `limit` does not look complete.
  `population.truncated` is a fetch-cap signal and is not used for this.
- Live pipelines are identifiers only (`configurations.pipelines[].id`). Answer a pipeline body or processor question
  from knowledge search as documentation, never as live configuration, and say that the live pipeline body is not in the
  diagnosis.

### Stale package banner

`package_status.stale: false` means Fleet knows no newer version, including when Fleet cannot reach the package
registry. Do not claim that the installed package is verified up to date from this value alone.

When `package_status.stale` is true, print this line before anything else, substituting the versions from
`package_status.package.installationInfo.version` and `package_status.package.latestVersion`. Do not rephrase it. Omit
it when freshness is unread:

```text
⚠️ Your Elastic Defend integration ({installedVersion}) is older than the latest available version ({latestVersion}). Troubleshooting recommendations may be outdated.
```

### Knowledge grounding unavailable

When the knowledge-search output has `available: false`, say "Knowledge grounding is unavailable." and continue the
classified path with the diagnose and search evidence only. Do not give possible causes, checks or remediation from
general model knowledge.

When the knowledge-search output has `available: true` but no result applies to the target's symptom, action or OS, say
that the knowledge base has no documentation for this symptom on this OS. Name the evidence facts. Do not list possible
causes, checks or remediation from general model knowledge. This includes "check ..." or "I'd suggest checking ..."
suggestions about the host's kernel, modules, drivers, OS settings or other software. Suggest a check only when a
diagnose reason or a search result supports it, and name that reason (for example, `agent_offline` → check the host's
connectivity and enrollment).

## Response format

- Evidence is the output of the workflows that the routing table names, plus host searches of the indices in
  [available_indices](references/available_indices.md). Do not call another tool, and do not search indices, to get host
  state, agent state, policy response, package freshness or package configuration: the diagnosis output has them.
- Print the stale banner, the caveat sentences and the unauthorized sentences as written.
- Name the target's ids, the policy name (`target.metadata.Endpoint.policy.applied.name`, only when present — a
  Fleet-only record has none) and the error messages from the diagnosis.
- Filter every search and every conclusion to the target endpoint. Never diagnose another host, and never give a
  diagnosis after saying the target was not found.
- Current state beats historical warnings: a historical warning never becomes the root cause of a current problem when
  the current state and the newest policy response are healthy.
- `CURRENTLY_HEALTHY`: a short answer with the current healthy evidence only (`target.host_status`,
  `target.metadata.Endpoint.policy.applied.status`, and `agent.status` when present), no warning-log findings, and a
  question for the symptom, time range, alert or behavior to investigate.
- Give possible causes, checks or remediation only when diagnose, search or applicable knowledge evidence supports them.
  Apply the knowledge grounding rules above when knowledge is unavailable or no result applies.
- Search with `POST /{index}/_search` or `POST /_query` only: only the listed indices, include `_id` and `_index` in
  every search, keep result sets small, and prefer the newest documents first unless the user asked about a past time
  range.
- There is no persistence step. Do not generate, save or acknowledge insights.

## Examples

### A policy failure on a named host

User: "Why is web-01 not applying its policy?" Run diagnose with the hostname. Print the stale banner when
`package_status.stale` is true. Classify from `health.state`; for `policy_failure`, name the failing action names and
messages from `policy_response.Endpoint.policy.applied.actions`, then knowledge-search with those terms, and answer with
knowledge-grounded remediation.

### Endpoints missing from the endpoint list

User: "Why are endpoints missing from my endpoint list?" Run diagnose without a host, report the counts with what each
covers and any failing transform as facts, and ask which host is missing. Diagnose the named host by the named-host
routing row.

### Alerts still fire despite an exception

User: "I added an endpoint exception but the alerts keep coming on host web-01." Run diagnose with the host; classify a
`healthy` diagnosis as `OTHER_CURRENT_ISSUE`, then find-artifacts for `endpoint_list` and `endpoint_trusted_apps` with
the policy filter. Report the matching artifacts and do not ask for a symptom.

### List trusted applications

User: "Show me the trusted applications." Run find-artifacts with `list_id: endpoint_trusted_apps`. Render name, OS,
scope and entries summary for each item, and print "Showing {n} of {population.total} trusted applications." when the
list was cut by `limit`.

### Create an exception

User: "Add an endpoint exception for putty.exe." Answer with the fixed refusal only. Run no workflow.

### Host not found

User: "Why is db-prod-07 unhealthy?" When the diagnose output carries `target_not_found`, print the not-found sentence
with the value the lookup used, and give no diagnosis.

## Guidelines

- Stay read-only. Creating, changing or auditing artifacts gets the fixed refusal; no write call ever runs.
- Reach the workflows only by id through `platform.core.execute_workflow`, never through `execute_api` or inline YAML,
  and never diagnose a host other than the target the user named.
- Print the stale banner, the caveat sentences and the unauthorized sentences exactly as written; never rephrase or
  reorder them.
- Ground every conclusion, possible cause, check and remediation step in workflow, search or applicable knowledge
  evidence, and name the target's ids, the policy name and the diagnosis error messages.
- Build knowledge queries from the user's exact terms and the concrete evidence, as in
  [knowledge_queries](references/knowledge_queries.md).
- Report facts for endpoint-list questions: counts with what they cover, failing transforms, and host state — never a
  cause inferred from a count difference.
- Current state beats historical warnings; keep `CURRENTLY_HEALTHY` answers short, and ask for the symptom to
  investigate.
- Search only the indices in [available_indices](references/available_indices.md), include `_id` and `_index`, keep
  result sets small, and prefer the newest documents.

## Operations

| HTTP API (shorthand)    | `elastic` CLI command                                             |
| ----------------------- | ----------------------------------------------------------------- |
| `POST /{index}/_search` | `elastic es search --index '<index>' --input-file '<query.json>'` |
| `POST /_query`          | `elastic es esql query --format tsv --query '<esql>'`             |

**Workflow operations.**

The three workflow rows run `platform.core.execute_workflow`; in a runtime that drives the `elastic` CLI, they run
through the Agent Builder tool-execute endpoint, with `tool_id: platform.core.execute_workflow` and `tool_params`
holding `workflowId`, `inputs` and `waitForCompletion`.

| Workflow operation                                                                                           | `elastic` CLI command                                                                           |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `platform.core.execute_workflow` — `system-security-endpoint-configuration-troubleshooting-diagnose`         | `elastic stack kb agent-builder post-agent-builder-tools-execute --input-file '<request.json>'` |
| `platform.core.execute_workflow` — `system-security-endpoint-configuration-troubleshooting-knowledge-search` | `elastic stack kb agent-builder post-agent-builder-tools-execute --input-file '<request.json>'` |
| `platform.core.execute_workflow` — `system-security-endpoint-configuration-troubleshooting-find-artifacts`   | `elastic stack kb agent-builder post-agent-builder-tools-execute --input-file '<request.json>'` |
