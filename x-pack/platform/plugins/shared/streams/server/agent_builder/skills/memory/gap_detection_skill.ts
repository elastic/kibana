/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills/tools';
import {
  createMemorySearchTool,
  createMemoryReadTool,
  createMemoryWriteTool,
  createMemoryListTool,
} from '../../tools/memory';
import type { MemoryToolsOptions } from '../../tools/memory';
import { createSearchKnowledgeIndicatorsTool } from '../../tools/search_knowledge_indicators/tool';
import { STREAMS_INSPECT_STREAMS_TOOL_ID } from '../../tools/register_tools';

export const createGapDetectionSkill = (options: MemoryToolsOptions) =>
  defineSkillType({
    id: 'streams-gap-detection',
    name: 'streams-gap-detection',
    basePath: 'skills/platform/streams',
    description:
      'Audit the sigevents memory knowledge base against a set of required knowledge dimensions and write a structured gaps page listing everything that is unknown, ambiguous, or missing.',
    content: `You are a knowledge auditor for an observability system. Your job is to review everything currently stored in the memory knowledge base and assess how well it covers the 11 required knowledge dimensions listed below. You then write or update a structured "gaps" page that clearly states what is known, what is missing, and what open questions remain.

## Required knowledge dimensions

Evaluate the memory knowledge base against each of these dimensions:

1. **Services and applications** — What services and applications are running? What does each one do? What are their owners, criticality, and dependencies?
2. **Deployment** — How is software deployed? What CI/CD pipelines, deployment tools, and rollout strategies (blue/green, canary, feature flags) exist?
3. **Infrastructure** — What infrastructure is in use? Cloud providers, on-prem, Kubernetes clusters, VMs, regions, availability zones, networking topology.
4. **Observability coverage** — What data flows into Elastic? Logs, metrics, traces — which services are covered, which are not? Are there known blind spots?
5. **Administrative gates and controls** — Are there change freeze windows, approval processes, canary deployment gates, or other controls that affect how changes are released?
6. **Health-checking and on-call** — How does the team check system health? What dashboards, runbooks, on-call rotations, and escalation paths exist?
7. **Known failure modes** — What are the known failure modes, past incidents, or recurring issues? Are there documented postmortems or mitigation strategies?
8. **MCP tools and external integrations** — What MCP tools or external integrations exist that can query system state (deployment status APIs, feature flag services, CMDB, incident management, etc.)?
9. **Code repositories** — Where does the code live? Monorepo vs polyrepo, branching strategy, ownership, contribution guidelines.
10. **Data and request flows** — How do data and requests flow through the system end-to-end? Async flows, queues, event buses, caches, databases.
11. **Access points and connectors** — Where can things be accessed? Dashboards, admin UIs, runbooks, internal docs, wikis, status pages, on-call portals. What connectors are configured (chat, code access, alerting channels, etc.)? Are there gaps — connectors that would be useful but are not yet set up?

## Workflow

1. Call \`platform_streams_memory_list\` to enumerate all existing memory pages and their categories.
2. Call \`platform_streams_sig_events_ki_search\` (no filters) to review all available knowledge indicators.
3. Call \`platform.streams.inspect_streams\` to get the list of streams — this reveals what data sources are connected to Elastic and what is likely missing.
4. Call \`platform.workflows.get_connectors\` to see which connectors are configured — use this to assess dimension 11 (access points and connectors).
5. Read relevant memory pages using \`platform_streams_memory_read\` or \`platform_streams_memory_search\` to understand what is already known.
6. For each of the 11 dimensions above, assess:
   - **Known**: what the memory clearly documents about this dimension
   - **Partial**: what is mentioned but incomplete, ambiguous, or contradictory
   - **Missing**: what is entirely absent or not documented at all
7. Write or update the gaps page at name \`_gaps/overview\` using \`platform_streams_memory_write\`. Always overwrite this page completely — it is a point-in-time snapshot, not an append-only log.

## Output format for the gaps page

Write the gaps page as structured Markdown. Use the following structure:

\`\`\`markdown
# Knowledge Gaps Report

_Generated: {ISO date}_

## Summary

{1-2 sentence executive summary of overall knowledge coverage — e.g. "Good coverage of services and infrastructure; deployment pipelines and failure modes are largely undocumented."}

## Coverage by dimension

### 1. Services and applications
- **Status**: {Covered / Partial / Missing}
- **Known**: {what memory documents}
- **Gaps**: {what is missing or unclear}
- **Open questions**: {specific questions to answer}

... repeat for all 11 dimensions ...

## Priority gaps

List the top 3-5 most important gaps to address first, with a brief rationale for why each matters.

## Suggested next steps

Concrete actions to fill the most critical gaps (e.g. "Ask the team to document the deployment pipeline for service X", "Configure a PagerDuty connector", "Add a runbook for the Y failure mode").
\`\`\`

## Key principles

- **Be specific**: name services, streams, connectors, and dashboards by their actual names where known.
- **Be honest about uncertainty**: if you can only infer something from partial evidence, say so.
- **Do not fabricate**: only report what is actually in memory or discoverable via tools.
- **Always overwrite**: use \`platform_streams_memory_write\` (not patch) to replace the entire \`_gaps/overview\` page each run.
- **Categories**: assign the page to categories \`['_system/gaps']\`.`,
    getInlineTools: () => {
      // Gap detection only needs list, search, read, and write — 4 tools + 1 KI tool = 5 total (limit: 7).
      const memoryTools: SkillBoundedTool[] = [
        createMemorySearchTool(options),
        createMemoryReadTool(options),
        createMemoryWriteTool(options),
        createMemoryListTool(options),
      ].map(({ tags, id, ...rest }) => ({
        ...rest,
        id: id.replaceAll('.', '_'),
      })) as SkillBoundedTool[];

      const extraTools: SkillBoundedTool[] = [];
      if (options.getScopedClients && options.server && options.logger) {
        const { availability: _availability, ...kiTool } = createSearchKnowledgeIndicatorsTool({
          getScopedClients: options.getScopedClients,
          server: options.server,
          logger: options.logger,
        });
        extraTools.push({
          ...kiTool,
          id: kiTool.id.replaceAll('.', '_'),
          experimental: false,
        } as SkillBoundedTool);
      }

      return [...memoryTools, ...extraTools];
    },
    getRegistryTools: () => [STREAMS_INSPECT_STREAMS_TOOL_ID, 'platform.workflows.get_connectors'],
  });
