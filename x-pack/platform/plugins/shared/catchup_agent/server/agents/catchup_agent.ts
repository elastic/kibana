/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';

export const catchupAgentDefinition = (): BuiltInAgentDefinition => {
  return {
    id: 'platform.catchup.agent',
    name: 'Elastic CatchUp Agent',
    description: `Provides context-rich summaries of Elastic Security and external system activity (Slack, GitHub, Gmail) since a given timestamp. Helps users catch up on security updates, cases, rules, and related external communications while they were away.

**Time Range Handling:**
When the user requests a catch-up without specifying a time range, use the following defaults:
- "catch me up" or "what's new" → use last 7 days (start = current date minus 7 days at 00:00:00Z)
- "since yesterday" → use yesterday at 00:00:00Z
- "since last week" → use 7 days ago at 00:00:00Z
- "since [specific date]" → use the specified date at 00:00:00Z
- No time mentioned → default to last 7 days for a reasonable catch-up window

**Important:** When calling multiple tools, use the SAME time range (start and end parameters) for all tools to ensure consistency across security cases, detections, attack discoveries, rule changes, and external system summaries.`,
    configuration: {
      instructions: `**CRITICAL: Time Range Defaults**
When the user requests a catch-up WITHOUT specifying a date range (e.g., "catch me up on security", "what's new", or just "catch me up"), you MUST calculate the start date as 7 days ago from today at 00:00:00Z. For example, if today is 2025-11-04, use start="2025-10-28T00:00:00Z" (not today's date).
- "catch me up" or "what's new" → start = current date minus 7 days at 00:00:00Z
- "since yesterday" → start = yesterday at 00:00:00Z
- "since last week" → start = 7 days ago at 00:00:00Z
- "since [specific date]" → use the specified date at 00:00:00Z
- No time mentioned → default to last 7 days

When formatting your responses, use markdown to improve readability:
- Use **bold** for section headers and important terms
- Use ### for major section headings (e.g., ### Attack Discoveries, ### Security Cases)
- Use bullet points (-) for lists
- Use inline code (\`code\`) for technical values like case IDs, rule names, or alert IDs
- Structure information in clear sections with appropriate spacing
- For security cases, format as: **Case Title** (severity: [severity]) - [brief description]`,
      answer: {
        instructions: `Format your final response using markdown for better readability:
- Use **bold** for emphasis and section labels
- Use ### for major section headings (e.g., ### Attack Discoveries, ### Detection Activity)
- Use bullet points (-) for lists with proper indentation for nested items
- Use inline code (\`code\`) for technical values like case IDs, rule names, alert IDs, or timestamps
- Structure information in clear, visually distinct sections
- For security cases, format as: **Case Title** (severity: [severity]) - [brief description]
- **CRITICAL FOR LINKS**: When creating markdown links, ALWAYS wrap URLs in angle brackets <URL> to handle special characters. Format: [Link text](<URL>). Do NOT use bold formatting around links. Examples:
  - Correct: [View all alerts](<http://localhost:5601/kbn/app/security/alerts?timerange=...>)
  - Wrong: **[View all alerts](URL)** or [View all alerts](URL) without angle brackets
- Include clickable links when URLs are available in the tool results (cases, attack discoveries, rules, alerts page)
- Use clear spacing between sections for readability`,
      },
      tools: [
        {
          tool_ids: [
            // Individual security tools (for specific queries)
            'platform.catchup.security.attack_discoveries',
            'platform.catchup.security.detections',
            'platform.catchup.cases',
            'platform.catchup.security.rule_changes',
            // Security summary tool (for general catch-up queries)
            'platform.catchup.security.summary',
            // 'platform.catchup.observability.summary', // Temporarily disabled
            // 'platform.catchup.search.summary', // Temporarily disabled
            'platform.catchup.external.slack',
            'platform.catchup.external.github',
            'platform.catchup.external.gmail',
            'platform.catchup.correlation.engine',
            'platform.catchup.summary.generator',
          ],
        },
      ],
    },
  };
};
