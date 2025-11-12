/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition, InternalAgentDefinition } from '@kbn/onechat-server/agents';
import type { KibanaRequest } from '@kbn/core-http-server';
import { getExampleAlertsUrl } from '../tools/utils/kibana_urls';
import { getPluginServices } from '../services/service_locator';

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

**CRITICAL: Slack Mention Summarization**
When using the Slack tool (hackathon.catchup.external.slack), you MUST:
1. **Use the userMentionMessages array for mentions** - ALL messages in this array mention the authenticated user
2. **Use the channelMessages array for regular messages** - These are general channel messages, NOT mentions
3. **Structure your Slack summary as follows:**
   - **First section: MENTIONS** - Use ALL messages from userMentionMessages array
     - Explicitly state "You were mentioned" or "Mentioned by [user]"
     - Use the user_name or user_real_name from the mentions array, NEVER user_id
     - Group by channel if helpful
     - Include thread replies that have mentions
   - **Second section: Regular Channel Messages** - Use messages from channelMessages array
   - **Third section: Direct Messages** (if includeDMs=true) - Include participant names from either array
4. **PRIORITIZE userMentionMessages** - these are the most important and should be listed first
5. **Never skip or ignore messages from userMentionMessages** - they are the highest priority
6. **CRITICAL: Do NOT report messages from channelMessages as mentions** - Only messages in userMentionMessages are actual mentions

When formatting your responses, use markdown to improve readability:
- Use **bold** for section headers and important terms
- Use ### for major section headings (e.g., ### Attack Discoveries, ### Security Cases, ### Slack Mentions)
- Use bullet points (-) for lists
- Use inline code (\`code\`) for technical values like case IDs, rule names, or alert IDs
- Structure information in clear sections with appropriate spacing
- For security cases, format as: **Case Title** (severity: [severity]) - [brief description]
- For Slack mentions, format as: **You were mentioned in #channel-name by @username**: [message summary]`,
      answer: {
        instructions: `Format your final response using markdown for better readability:
- Use **bold** for emphasis and section labels
- Use ### for major section headings (e.g., ### Attack Discoveries, ### Detection Activity, ### Slack Mentions)
- Use bullet points (-) for lists with proper indentation for nested items
- Use inline code (\`code\`) for technical values like case IDs, rule names, alert IDs, or timestamps
- Structure information in clear, visually distinct sections
- For security cases, format as: **Case Title** (severity: [severity]) - [brief description]
- **CRITICAL FOR SLACK SUMMARIES**: When summarizing Slack messages:
  - **ALWAYS start with a "### Slack Mentions" section** if any messages have non-empty mentions arrays
  - In the mentions section, explicitly state "You were mentioned" or "Mentioned by [user]"
  - Format mentions as: **You were mentioned in #channel-name by @username**: [message summary]
  - Follow with a "### Slack Channel Messages" section for regular messages (where mentions array is empty)
  - Never skip messages with mentions - they are the highest priority
- **CRITICAL FOR LINKS**: When creating markdown links, ALWAYS wrap URLs in angle brackets <URL> to handle special characters. Format: [Link text](<URL>). Do NOT use bold formatting around links. URLs provided by tools are already dynamically generated with the correct Kibana host, base path, and space. Examples:
  - Correct: [View all alerts](<EXAMPLE_ALERTS_URL>)
  - Wrong: **[View all alerts](URL)** or [View all alerts](URL) without angle brackets
- Include clickable links when URLs are available in the tool results (cases, attack discoveries, rules, alerts page)
- **For Slack messages**: Link to EVERY message you mention using the permalink field. For threads, only one link is needed (thread replies share the parent's permalink). Use markdown format: [View message](<permalink_url>) or [View thread](<permalink_url>)
- Use clear spacing between sections for readability`,
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
            // 'hackathon.catchup.correlation.engine', // Removed from agent - this tool is for workflows only, requires results parameter from multiple tools
            // 'hackathon.catchup.summary.generator', // Removed from agent - this tool is for workflows only, requires correlatedData parameter
          ],
        },
      ],
    },
  };
};

/**
 * Customize the catchup agent definition with dynamic URLs based on request context
 */
export const customizeCatchupAgentDefinition = (
  definition: InternalAgentDefinition,
  request?: KibanaRequest
): InternalAgentDefinition => {
  if (!request || definition.id !== 'hackathon.catchup.agent') {
    return definition;
  }

  try {
    const { core } = getPluginServices();
    const exampleUrl = getExampleAlertsUrl(request, core);

    // Replace the placeholder in the answer instructions
    const answerInstructions = definition.configuration?.answer?.instructions || '';
    const customizedAnswerInstructions = answerInstructions.replace(
      '<EXAMPLE_ALERTS_URL>',
      exampleUrl
    );

    return {
      ...definition,
      configuration: {
        ...definition.configuration,
        answer: {
          ...definition.configuration?.answer,
          instructions: customizedAnswerInstructions,
        },
      },
    };
  } catch (error) {
    // If we can't customize, return the original definition
    return definition;
  }
};
