/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools, platformCoreCasesTools } from '@kbn/agent-builder-common';

export const casesSkill = defineSkillType({
  id: 'cases-management',
  name: 'cases-management',
  basePath: 'skills/platform/cases',
  description:
    'Manage investigation and incident cases across Elastic Security, Observability, and Stack Management. Covers creating, updating, searching, and enriching cases with comments, alerts, events, and observables (IOCs).',

  content: `# Cases Management

## Domain Model

A **Case** is an investigation or incident record. Core fields:
- **status**: \`open\` → \`in-progress\` → \`closed\`
- **severity**: \`low\` / \`medium\` / \`high\` / \`critical\`
- **owner**: which Elastic solution owns it — \`securitySolution\`, \`observability\`, or \`cases\`
- **assignees**: user profile UIDs (not usernames) responsible for the investigation
- **tags**, **category**, **customFields**: optional classification
- **Attachments**: user comments, linked alerts, linked log/event documents
- **Observables**: indicators of compromise (IOCs) tracked within the case — IP addresses, domains, file hashes, URLs, email addresses, registry keys

The \`owner\` field is the most important signal for how to handle a case.

## Solution Contexts

### \`securitySolution\` — Elastic Security

- **Purpose**: Threat investigation and security incident response
- **Triggers**: SIEM detection rule alerts, threat hunts, manual triage
- **Observables**: PRIMARY use case. When a user mentions an IP address, domain, file hash, URL, or email in the context of a security case, proactively suggest adding it as an observable via the observables tool.
- **Alert attachments**: Attach SIEM/detection-rule alerts to link evidence to the case
- **Severity**: Maps to threat impact — \`critical\` = active attack in progress
- **Typical workflow**: Alert fires → create case → attach alerts → track observables → investigate → close

### \`observability\` — Elastic Observability

- **Purpose**: Service incident management and SRE workflows
- **Triggers**: APM errors, metric threshold breaches, SLO violations, log anomalies
- **Observables**: Rarely relevant. Do NOT proactively suggest observable tracking for observability cases unless the user explicitly asks.
- **Alert attachments**: Attach APM errors, metric threshold alerts, SLO breach alerts, log anomaly alerts
- **Severity**: Maps to service impact — \`critical\` = complete service outage
- **Typical workflow**: SLO breach / metric alert → create case → attach relevant alerts or events → root cause analysis → remediation → close

### \`cases\` — Stack Management

- **Purpose**: General-purpose case management with no domain-specific assumptions
- **Observables**: Rarely relevant
- **Use when**: The user wants a case that doesn't belong to Security or Observability

## Solution Context

Before making any cases tool call, establish which Elastic solution the user is working in:

1. **Infer from conversation**: SIEM alerts / detection rules / threat hunting / IOCs → \`securitySolution\`; APM errors / SLO violations / service latency / metric thresholds → \`observability\`; no domain signals → ask.
2. **Ask at most once per session**: "Are you working in Elastic Security, Observability, or Stack Management?" Remember the answer for the rest of the conversation.
3. **Always pass \`owner\`** on every search or filter call once the context is known. Never fan out across all three owners unless the user explicitly requests results from multiple solutions.
4. **Update the context** if the user later references a different solution (e.g. switches from Security to Observability work).

## Tool Routing

| What the user wants | Tool to use |
|---------------------|-------------|
| Find, search, filter, or bulk-retrieve cases; find similar cases; find cases by alert ID | \`${platformCoreTools.cases}\` |
| Create, update, delete cases; assign/unassign users; add tags; set custom fields; create from template | \`${platformCoreCasesTools.manage}\` |
| Add comments; attach alerts or events to a case; retrieve all attachments | \`${platformCoreCasesTools.attachments}\` |
| Track observables (IOCs): add, update, or delete indicators on a case | \`${platformCoreCasesTools.observables}\` |

When updating **two or more cases in one request**, always use \`update_bulk\` mode — it accepts a \`cases\` array, resolves versions per case, and completes in a single round-trip. Only use \`update\` for single-case edits.

When \`similar_to_case_id\` returns results, surface the shared observables to explain why cases are considered similar. Prefer \`assign\`/\`unassign\` modes over \`update\` when only changing assignees — \`update\` requires a version token and can conflict if the case was modified concurrently.
`,

  getRegistryTools: () => [
    platformCoreTools.cases,
    platformCoreCasesTools.manage,
    platformCoreCasesTools.attachments,
    platformCoreCasesTools.observables,
  ],
});
