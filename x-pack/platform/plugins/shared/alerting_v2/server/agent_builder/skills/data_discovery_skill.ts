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
    'Discover and describe user data sources to understand what data exists. ' +
    'Use when the user wants to explore, identify, or understand their data.',
  content: `# Data Discovery Guide

## When to Use This Skill

Use this skill when:
- A user asks "what data do I have?" or "help me understand my data"
- A user wants to explore what's available in their Elasticsearch cluster
- A user wants to understand the shape or contents of a particular data source
- You need to profile a data source before the user decides what to do with it

## Discovery Process

### 1. Discover Available Data Sources

- Use \`${internalNamespaces.alertingV2}.discover_data_sources\` to scan for indices, data streams, and aliases
- The tool automatically discovers and includes remote clusters — no special configuration needed
- If the user described a domain (e.g. "application logs", "infrastructure metrics"), pass a relevant pattern (e.g. \`logs-*\`, \`metrics-*\`, \`traces-*\`)
- If the user has no preference, scan with the default pattern to show everything
- The tool **automatically creates an attachment** for each discovered data source — each attachment has a Preview button that opens an interactive ES|QL editor and data table
- Follow the \`_renderInstructions\` from the tool result to render attachment cards in your response
- **Pagination**: The tool returns 10 results per page by default. Check the \`showing\` field (e.g. \`{ from: 1, to: 10 }\`) and \`hasMore\` boolean. When \`hasMore\` is true, tell the user: "Showing X–Y of Z data sources. Would you like to see more?" If the user says yes, call \`discover_data_sources\` again with the same \`pattern\` and \`offset\` set to the current \`showing.to\` value to fetch the next page
- The user can click "Preview" on any card to explore the data immediately, or ask for a deeper analysis via \`describe_data_source\`
- After presenting results, **proactively suggest describing** one or two data sources that look most relevant — highlight what stands out (e.g. high document volume, domain-specific names, mix of logs vs metrics) and offer to analyze them further. For example: "You have application logs with 12M documents and infrastructure metrics — would you like me to dig deeper into either to show you what services are running, what errors are occurring, and how the components relate?" Do not describe automatically — ask first.

### 2. Describe the Selected Data Source

Call \`${internalNamespaces.alertingV2}.describe_data_source\` when the user wants to understand a specific data source. Trigger it when:
- The user **selects or names a specific data source** (e.g. "I want to dig into remote_cluster:metrics-hostmetricsreceiver.otel-default", "tell me more about the second one", "that one looks interesting")
- The user **responds to your suggestion** to analyze a data source after discovery
- The user asks to **explore, analyze, or understand** a particular data source

Call \`${internalNamespaces.alertingV2}.describe_data_source\` with:
- The **exact name** from the discovery results (including any CCS prefix like \`remote_cluster:index-name\`)
- **Always set \`extract_knowledge_indicators: true\`** — this provides application architecture context (entities, dependencies, technology stack)
- Knowledge indicators are sourced from the streams plugin when available (instant, no LLM cost), otherwise extracted via LLM from sample documents
- The tool **enriches the existing attachment** created during discovery (updating it with schema, patterns, errors, and knowledge indicators) rather than creating a duplicate
- Follow the \`_renderInstructions\` from the tool result to render the enriched attachment card in your response
- The description returns up to four sections — interpret each one for the user:

#### Schema (field types and value distributions)
- Identify **entity fields** — keyword fields with moderate cardinality that represent logical entities (e.g. \`host.name\`, \`service.name\`, \`kubernetes.pod.name\`, \`cloud.region\`)
- Identify **status/level fields** — fields like \`log.level\`, \`http.response.status_code\`, \`event.outcome\` that indicate state or severity
- Identify **numeric/measurement fields** — fields like \`system.cpu.total.pct\`, \`http.response.body.bytes\` that carry quantitative measurements
- Note the **time field** (usually \`@timestamp\`) and total document count

#### Log Patterns (recurring message patterns)
- Summarise the most frequent patterns — these represent the normal baseline of the data
- Highlight any patterns that suggest operational events (startups, shutdowns, deployments)
- Highlight any patterns that suggest errors or warnings
- Note the pattern frequency — high-frequency patterns are the baseline; low-frequency patterns may be anomalies worth investigating

#### Error Samples (sample error-level documents)
- Summarise the types of errors present — what services or components are producing errors
- Note common error signatures and recurring messages
- If no error samples were found, report that the data source may not contain error-level logs (it could be metrics-only data)

#### Knowledge Indicators (application architecture)
- Present the identified **entities** — the services, databases, queues, and other components in the system
- Highlight **dependencies** — service-to-service relationships that reveal how components interact
- Note the **technology stack** — languages, frameworks, and libraries provide context for error pattern interpretation (e.g. Java stack traces, Python tracebacks, .NET exceptions)
- Mention the **infrastructure** — cloud provider, Kubernetes, OS details
- Note the **schema type** — ECS vs OTel vs custom affects field naming conventions
- The \`source\` field indicates where indicators came from: \`"index"\` means they were pre-computed by the streams plugin (high confidence), \`"llm"\` means they were freshly extracted (verify with the user)
`,
  referencedContent: [
    {
      name: 'interpreting-descriptions',
      relativePath: '.',
      content: `# How to Interpret Data Source Descriptions

## Schema Section

The schema section shows field names, types, and value distributions from a sample of documents.

### Field Types
- **keyword**: Exact-match string fields. Typically represent categories, identifiers, or enumerated values (e.g. service names, log levels, status codes).
- **text / match_only_text**: Full-text fields containing free-form messages. Commonly used for log messages and error descriptions.
- **long / double / float**: Numeric fields carrying measurements, counts, or percentages.
- **date**: Timestamp fields marking when events occurred.
- **boolean**: Binary true/false fields.
- **ip**: IP address fields identifying network sources or destinations.

### Value Distributions
Each field shows its top values and the percentage of sampled documents containing that value. Use this to understand:
- **Cardinality**: Few distinct values suggest a categorical field (e.g. a handful of service names). Many distinct values suggest an identifier or high-cardinality field (e.g. request IDs, trace IDs).
- **Skew**: If one value dominates (e.g. \`log.level: INFO (95%)\`), the rare values (ERROR, CRITICAL) may be more interesting to the user.
- **Coverage**: Fields present in most documents are core to the data. Fields present in few documents may be optional or specific to certain event types.

## Log Patterns Section

Log patterns are identified by the \`categorize_text\` aggregation, which groups similar log messages into patterns with placeholders for variable parts.

### What to Look For
- **High-frequency patterns** represent the normal baseline — routine operations the system performs regularly.
- **Low-frequency patterns** may indicate errors, anomalies, or rare events worth investigating.
- **Pattern fields**: The \`field\` tells you whether the pattern was found in \`message\` or \`body.text\`.
- **Regex**: The \`regex\` field captures the structural signature of the pattern.

## Error Samples Section

Error samples are documents matching \`log.level: error\` or messages containing "error"/"exception" keywords.

### What to Look For
- **Error diversity**: Are errors coming from one component or many?
- **Error signatures**: Recurring error messages (e.g. "Connection refused", "OutOfMemoryError") indicate persistent issues.
- **Absence of errors**: If no error samples are found, the data source may not contain error-level logs (it could be metrics-only data).

## Knowledge Indicators Section

Knowledge indicators characterise the application architecture from the log data. They are either retrieved from the streams plugin index (pre-computed, high confidence) or freshly extracted via LLM.

### Indicator Types
- **Entity** indicators identify services, databases, queues, and other components. Their \`properties.name\` reveals the logical component name. Entities with low confidence (< 50) should be verified with the user.
- **Infrastructure** indicators describe the deployment environment — cloud provider, Kubernetes cluster, operating system.
- **Technology** indicators reveal the tech stack — languages, frameworks, and libraries. These help interpret error patterns (e.g. Java stack traces, Python tracebacks, .NET exceptions).
- **Dependency** indicators map service-to-service relationships — which components call or depend on each other.
- **Schema** indicators (\`ecs\`, \`otel\`, \`custom\`) identify the log schema family, which determines field naming conventions (e.g. ECS uses \`service.name\`, OTel uses \`resource.attributes.service.name\`).

### Source Field
- \`source: "index"\` — indicators came from the streams plugin (previously computed and stored). These are reliable and don't require verification.
- \`source: "llm"\` — indicators were freshly extracted by the LLM from sample documents. Present them to the user and ask for confirmation.
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
