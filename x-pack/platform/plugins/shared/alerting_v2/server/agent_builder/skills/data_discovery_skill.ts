/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { platformCoreTools } from '@kbn/agent-builder-common/tools/constants';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const dataDiscoverySkill = defineSkillType({
  id: 'data-discovery',
  name: 'data-discovery',
  basePath: 'skills/platform/alerting',
  description:
    'Discover and describe user data sources to understand what monitoring-relevant data exists. ' +
    'Use when the user wants to set up alerting but needs help identifying data or understanding its shape.',
  content: `# Data Discovery Guide

## When to Use This Skill

Use this skill when:
- A user wants to set up monitoring or alerting but hasn't identified which data to monitor
- A user asks "what data do I have?" or "help me understand my data"
- A user mentions a specific data source and wants to create rules or alerts against it
- You need to understand the shape of a data source before suggesting rules
- A user wants to explore what's available in their Elasticsearch cluster

## Cross-Cluster Search (CCS) Awareness

Both discovery and description tools fully support CCS. When the user's data lives on remote clusters:
- \`discover_data_sources\` **automatically detects** configured remote clusters and scans them alongside the local cluster
- Results include CCS-prefixed names (e.g. \`remote_cluster:logs-nginx.default\`) — pass these directly to \`describe_data_source\`
- If the result includes a \`remoteClusters\` field, mention which remote clusters were scanned
- If results come from a remote cluster, the \`cluster\` field on each entry identifies the source

## Discovery Process

### 1. Discover Available Data Sources

- Use \`${internalNamespaces.alertingV2}.discover_data_sources\` to scan for indices, data streams, and aliases
- The tool automatically discovers and includes remote clusters — no special configuration needed
- If the user described a domain (e.g. "application logs", "infrastructure metrics"), pass a relevant pattern (e.g. \`logs-*\`, \`metrics-*\`, \`traces-*\`)
- If the user has no preference, scan with the default pattern to show everything
- The tool **automatically creates an attachment** for each discovered data source — each attachment has a Preview button that opens an interactive ES|QL editor and data table
- The tool result includes an \`attachmentIds\` map and a \`_renderInstructions\` field with ready-to-use \`<render_attachment>\` tags
- **YOU MUST render every data source as an inline card** by copying the \`<render_attachment id="ATTACHMENT_ID"/>\` tags from \`_renderInstructions\` into your response. This is how the user sees interactive preview cards — without these tags, the user only sees plain text
- **CRITICAL formatting rule**: Start your response with ALL the \`<render_attachment>\` tags FIRST, before any text. The \`_renderInstructions\` field shows the exact format. Each tag must be on its own line with a blank line between tags. Write your text summary AFTER all the tags. This is because the markdown parser only recognizes tags that start a text block — any text before a tag will break rendering.
- If the result includes a \`remoteClusters\` field, mention which remote clusters were scanned
- **Pagination**: The tool returns 10 results per page by default. Check the \`showing\` field (e.g. \`{ from: 1, to: 10 }\`) and \`hasMore\` boolean. When \`hasMore\` is true, tell the user: "Showing X–Y of Z data sources. Would you like to see more?" If the user says yes, call \`discover_data_sources\` again with the same \`pattern\` and \`offset\` set to the current \`showing.to\` value to fetch the next page
- The user can click "Preview" on any card to explore the data immediately, or ask for a deeper analysis via \`describe_data_source\`

### 2. Describe the Selected Data Source

**IMPORTANT**: You MUST call \`${internalNamespaces.alertingV2}.describe_data_source\` before suggesting or creating any rules. This step is required — never skip it. Trigger it when:
- The user **mentions a specific data source by name** (e.g. "I want to dig into remote_cluster:metrics-hostmetricsreceiver.otel-default")
- The user wants to **create rules or alerts** against a data source
- The user asks to **explore, analyze, or understand** a particular data source

Call \`${internalNamespaces.alertingV2}.describe_data_source\` with:
- The **exact name** from the discovery results (including any CCS prefix like \`remote_cluster:index-name\`)
- **Always set \`extract_knowledge_indicators: true\`** — this provides crucial application architecture context (entities, dependencies, technology stack) that informs better rule suggestions
- Knowledge indicators are sourced from the streams plugin when available (instant, no LLM cost), otherwise extracted via LLM from sample documents
- The tool **enriches the existing attachment** created during discovery (updating it with schema, patterns, errors, and knowledge indicators) rather than creating a duplicate
- The tool result includes a \`_renderInstructions\` field with the \`<render_attachment>\` tag for the updated card. **Render the enriched card** by placing the tag on its own line in your response — this shows the user the updated card with field counts, patterns, errors, and knowledge indicators
- The description returns up to four sections — interpret each one for the user:

#### Schema (field types and value distributions)
- Identify **grouping candidates** — keyword fields with moderate cardinality that represent entities (e.g. \`host.name\`, \`service.name\`, \`kubernetes.pod.name\`, \`cloud.region\`). These are valuable for per-entity alerting.
- Identify **status/level fields** — fields like \`log.level\`, \`http.response.status_code\`, \`event.outcome\` that can drive alert conditions
- Identify **numeric fields** — fields like \`system.cpu.total.pct\`, \`http.response.body.bytes\` that support threshold-based alerting
- Note the **time field** (usually \`@timestamp\`) and total document count

#### Log Patterns (recurring message patterns)
- Summarise the most frequent patterns — these represent the normal baseline of the data
- Highlight any patterns that suggest operational events (startups, shutdowns, deployments)
- Highlight any patterns that suggest errors or warnings
- Note the pattern frequency — high-frequency patterns are the baseline; low-frequency patterns may be anomalies worth alerting on

#### Error Samples (sample error-level documents)
- Summarise the types of errors present — what services or components are producing errors
- Note common error signatures that could become alert conditions
- If no error samples were found, report that the data source may not contain error-level logs (it could be metrics-only data)

#### Knowledge Indicators (application architecture)
- Present the identified **entities** — these are the services, databases, queues, and other components in the system. They are prime candidates for per-entity grouping in rules (\`BY service.name\`, \`BY k8s.deployment.name\`).
- Highlight **dependencies** — service-to-service relationships suggest multi-source correlation opportunities (e.g. alert when an upstream dependency is failing).
- Note the **technology stack** — languages, frameworks, and libraries provide context for error pattern interpretation (e.g. Java stack traces, Python tracebacks, .NET exceptions).
- Mention the **infrastructure** — cloud provider, Kubernetes, OS details help scope infrastructure-level rules.
- Note the **schema type** — ECS vs OTel vs custom affects how ES|QL queries should be written (different field naming conventions).
- The \`source\` field indicates where indicators came from: \`"index"\` means they were pre-computed by the streams plugin (high confidence), \`"llm"\` means they were freshly extracted (verify with the user).

### 3. Summarise Findings

After describing the data source, provide a concise summary:
- **Application architecture**: What kind of system is this? (microservices, monolith, infrastructure, etc.) What are the main components and how do they relate?
- **Data type**: Is this logs, metrics, traces, or something else?
- **Key entities**: What are the main grouping dimensions (hosts, services, pods, etc.)?
- **Monitoring opportunities**: What kinds of conditions could be detected? (error rates, threshold breaches, pattern anomalies, no-data conditions)
- **Data volume**: Is this high-volume (may want signal rules) or low-volume (alert rules with direct notifications)?

### 4. Next Steps

Based on the description, suggest next actions:
- "Based on your data, you could set up rules for [specific scenarios]. Would you like me to help create a rule?"
- The user can then proceed to rule creation via the alert-rule-creation skill
- If the user wants to explore more data sources, loop back to step 1
- **Never suggest rules without first completing step 2** — the schema, patterns, and knowledge indicators from \`describe_data_source\` are essential for accurate rule suggestions
`,
  referencedContent: [
    {
      name: 'interpreting-descriptions',
      relativePath: '.',
      content: `# How to Interpret Data Source Descriptions

## Schema Section

The schema section shows field names, types, and value distributions from a sample of documents.

### Field Types and What They Mean for Alerting
- **keyword**: Exact-match fields. Good for grouping (\`BY host.name\`), filtering (\`WHERE service.name == "api"\`), and set membership (\`IN ("ERROR", "WARN")\`).
- **text / match_only_text**: Full-text fields. Good for pattern matching (\`body.text:"OutOfMemoryError"\`). Not usable in \`STATS ... BY\`.
- **long / double / float**: Numeric fields. Good for thresholds (\`WHERE avg_cpu > 0.9\`), aggregations (\`STATS avg_val = AVG(field)\`).
- **date**: Timestamp fields. Used for time-range filtering.
- **boolean**: Binary fields. Can drive simple conditions.
- **ip**: IP address fields. Good for grouping by source/destination.

### Value Distributions
Each field shows its top values and the percentage of sampled documents containing that value. Use this to understand:
- **Cardinality**: Few values = good for grouping. Many values = likely an identifier or high-cardinality field.
- **Skew**: If one value dominates (e.g. \`log.level: INFO (95%)\`), alerting on rare values (ERROR, CRITICAL) is meaningful.
- **Coverage**: Fields present in most documents are reliable for queries. Fields present in few documents may be optional or type-specific.

## Log Patterns Section

Log patterns are identified by the \`categorize_text\` aggregation, which groups similar log messages into patterns with placeholders for variable parts.

### What to Look For
- **High-frequency patterns** are the normal baseline. They represent routine operations.
- **Low-frequency patterns** may indicate errors, anomalies, or rare events worth alerting on.
- **Pattern fields**: The \`field\` tells you whether the pattern was found in \`message\` or \`body.text\`.
- **Regex**: The \`regex\` field can be used to construct precise match conditions.

## Error Samples Section

Error samples are documents matching \`log.level: error\` or messages containing "error"/"exception" keywords.

### What to Look For
- **Error diversity**: Are errors coming from one component or many?
- **Error signatures**: Recurring error messages (e.g. "Connection refused", "OutOfMemoryError") make good alert conditions.
- **Absence of errors**: If no error samples are found, the data may be metrics-only, or the time range may not contain errors.

## Knowledge Indicators Section

Knowledge indicators characterise the application architecture from the log data. They are either retrieved from the streams plugin index (pre-computed, high confidence) or freshly extracted via LLM.

### Indicator Types and What They Mean for Alerting

- **Entity** indicators identify services, databases, queues, and other components. Use their \`properties.name\` as grouping dimensions in rules (e.g. \`BY service.name\`). Entities with low confidence (< 50) should be verified with the user.
- **Infrastructure** indicators describe the deployment environment (cloud provider, Kubernetes, OS). Use these to scope infrastructure-level rules (e.g. CPU/memory thresholds per node or cluster).
- **Technology** indicators reveal the tech stack (languages, frameworks, libraries). Use these to interpret error patterns (e.g. Java \`NullPointerException\`, Python \`Traceback\`, .NET \`DbUpdateException\`).
- **Dependency** indicators map service-to-service relationships. Use these to suggest correlated alerting — when service A depends on service B, an alert on B failing can be paired with a no-data or error-rate alert on A.
- **Schema** indicators (\`ecs\`, \`otel\`, \`custom\`) determine field naming conventions for ES|QL queries. ECS uses \`service.name\`, \`log.level\`; OTel uses \`resource.attributes.service.name\`, \`severity_text\`.

### Source Field
- \`source: "index"\` — indicators came from the streams plugin (previously computed and stored). These are reliable and don't require verification.
- \`source: "llm"\` — indicators were freshly extracted by the LLM from sample documents. Present them to the user and ask for confirmation before using them in rule suggestions.
`,
    },
  ],
  getRegistryTools: () => [
    `${internalNamespaces.alertingV2}.discover_data_sources`,
    `${internalNamespaces.alertingV2}.describe_data_source`,
    platformCoreTools.listIndices,
    platformCoreTools.indexExplorer,
  ],
});
