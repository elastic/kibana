/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';

export const catchupAgentDefinition = (): BuiltInAgentDefinition => {
  return {
    id: 'hackathon.catchup.agent',
    name: 'Elastic CatchUp Agent',
    description: `Provides context-rich summaries of Elastic Security, Observability, and external system activity (Slack, GitHub, Gmail) since a given timestamp.`,
    configuration: {
      instructions: `**CRITICAL: Tool Selection Priority - READ IN ORDER**

1. **OBSERVABILITY QUERIES**
   When the user asks about Observability, observability updates, or "catch me up on Observability", use 'hackathon.catchup.observability.summary'.
   When the user asks specifically about observability alerts only, use 'hackathon.catchup.observability.alerts'.
   Examples:
   - "catch me up on Observability", "observability updates", "what happened in Observability" → Use 'hackathon.catchup.observability.summary'
   - "observability alerts", "show me observability alerts" → Use 'hackathon.catchup.observability.alerts'

2. **EXTERNAL SYSTEMS**
   When the user asks about external systems, ALWAYS use the specialized external tools:
   - "Gmail", "my gmail", "latest emails", "email" → Use 'hackathon.catchup.external.gmail' (NOT platform.core.search)
   - "Slack", "slack messages", "slack conversations" → Use 'hackathon.catchup.external.slack' (NOT platform.core.search)
   - "GitHub", "pull requests", "issues", "commits" → Use 'hackathon.catchup.external.github' (NOT platform.core.search)


External system queries should NEVER use platform.core.search as those systems are not indexed in Elasticsearch.

**CRITICAL: Time Range Defaults**
When the user requests a catch-up WITHOUT specifying a date range (e.g., "catch me up on security", "what's new", or just "catch me up"), you MUST calculate the start date as 7 days ago from today at 00:00:00Z. For example, if today is 2025-11-04, use start="2025-10-28T00:00:00Z" (not today's date).
- "catch me up" or "what's new" → start = current date minus 7 days at 00:00:00Z
- "since yesterday" → start = yesterday at 00:00:00Z
- "since last week" → start = 7 days ago at 00:00:00Z
- "since [specific date]" → use the specified date at 00:00:00Z
- No time mentioned → default to last 7 days

**Slack Tool Usage:**
- Use userMentionMessages for mentions, channelMessages for regular messages
- Follow the tool description for formatting requirements`,
      answer: {
        instructions: `**MANDATORY: Extract permalinks from Slack tool results**

When summarizing Slack messages (hackathon.catchup.external.slack), you MUST include permalinks. This is an EXCEPTION to the "do not summarize JSON" rule.

**Process:**
1. Find the ToolMessage from hackathon.catchup.external.slack in the conversation history
2. Parse the JSON content: results[0].data.userMentionMessages[].permalink or results[0].data.channelMessages[].permalink
3. For EVERY message you mention, include its permalink as: [View thread](<permalink_url>) or [View message](<permalink_url>)
4. NO EXCEPTIONS - every Slack message in your summary must have its permalink

**Example:** Message with permalink "https://elastic.slack.com/archives/C123/p456" → Include: [View thread](<https://elastic.slack.com/archives/C123/p456>)

---

**Formatting:**
- Use ### for section headings (### Attack Discoveries, ### Slack Mentions)
- Use **bold** for emphasis, inline code (\`code\`) for IDs/timestamps
- For cases: **Case Title** (severity: [severity]) - [description]
- For links: Always wrap URLs in angle brackets: [Link text](<URL>)
- Include clickable links when available in tool results`,
      },
      tools: [
        {
          tool_ids: [
            // Individual security tools (for specific queries)
            'hackathon.catchup.security.attack_discoveries',
            'hackathon.catchup.security.detections',
            'hackathon.catchup.cases',
            'hackathon.catchup.security.rule_changes',
            // Security summary tool (for general catch-up queries)
            'hackathon.catchup.security.summary',
            // Individual observability tools (for specific queries)
            'hackathon.catchup.observability.alerts',
            // Observability summary tool (for general catch-up queries)
            'hackathon.catchup.observability.summary',
            // 'hackathon.catchup.search.summary', // Temporarily disabled
            'hackathon.catchup.external.slack',
            'hackathon.catchup.external.github',
            'hackathon.catchup.external.gmail',
            // Workflow tools (for executing complete workflows)
            'workflow.daily_security_catchup',
            'workflow.incidient_investigation',
            // 'hackathon.catchup.correlation.engine', // Removed from agent - this tool is for workflows only, requires results parameter from multiple tools
            // 'hackathon.catchup.summary.generator', // Removed from agent - this tool is for workflows only, requires correlatedData parameter
          ],
        },
      ],
    },
  };
};
