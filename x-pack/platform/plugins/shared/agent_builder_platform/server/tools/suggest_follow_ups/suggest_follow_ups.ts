/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType, SUGGESTED_ACTIONS_UI_EVENT } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createOtherResult } from '@kbn/agent-builder-server';

const suggestedActionSchema = z.object({
  label: z.string().describe('Short button label (2-5 words).'),
  prompt: z.string().describe('Complete message sent on behalf of the user when clicked.'),
  icon: z
    .string()
    .optional()
    .describe(
      'Optional EUI icon name. Must be one of: ' +
        'plus, minus, cross, check, pencil, trash, copy, save, refresh, ' +
        'download, upload, share, link, search, filter, gear, eye, ' +
        'play, playFilled, pause, stop, send, return, ' +
        'arrowLeft, arrowRight, arrowDown, arrowUp, ' +
        'question, help, info, warning, alert, error, bulb, ' +
        'document, documents, list, grid, calendar, clock, ' +
        'sparkles, bolt, comment, star, flag, ' +
        'dashboardApp, discoverApp, visualizeApp.'
    ),
  color: z
    .string()
    .optional()
    .describe('Optional semantic color: primary, success, accent, warning, danger.'),
  url: z
    .string()
    .optional()
    .describe(
      'Optional Kibana-relative URL that opens in a new tab instead of sending a prompt. ' +
        'Must start with /app/. Use ONLY when the resource ID is known from a prior tool result. ' +
        'Examples: /app/dashboards#/view/<dashboardId>, ' +
        '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors/<connectorId>, ' +
        '/app/discover. ' +
        'Do NOT guess IDs; only use IDs returned by tools in the current conversation.'
    ),
});

/**
 * Validates that a URL is a safe Kibana-relative path.
 * Returns the URL unchanged if valid, or `undefined` if it should be stripped.
 */
const validateKibanaUrl = (url: string | undefined): string | undefined => {
  if (!url) {
    return undefined;
  }

  const APP_PATH_RE = /^\/app\/[\w-]+([\/#?].*)?$/;
  if (!APP_PATH_RE.test(url)) {
    return undefined;
  }

  try {
    const parsed = new URL(url, 'http://localhost');
    if (parsed.protocol !== 'http:' || parsed.hostname !== 'localhost') {
      return undefined;
    }
  } catch {
    return undefined;
  }

  return url;
};

const suggestFollowUpsSchema = z.object({
  actions: z
    .array(suggestedActionSchema)
    .min(1)
    .max(3)
    .describe(
      'Array of 1-3 follow-up actions. Each renders as a clickable pill button below the response.'
    ),
});

export const suggestFollowUpsTool = (): BuiltinToolDefinition<typeof suggestFollowUpsSchema> => {
  return {
    id: platformCoreTools.suggestFollowUps,
    type: ToolType.builtin,
    description:
      'Set contextual follow-up action buttons that appear below the agent response. ' +
      'Each action has a label (button text) and a prompt (the message sent when clicked). ' +
      'Actions can optionally include a `url` to navigate to a Kibana page in a new tab. ' +
      'Use after generating summaries, surfaces, or explanations when there is a clear next step. ' +
      'Call this tool once per response with all desired actions. ' +
      'Do NOT suggest backward-navigation actions (e.g. "Back", "Go back", "Previous step"). ' +
      'This is a chat-based interface where users scroll up to revisit earlier responses.',
    schema: suggestFollowUpsSchema,
    tags: [],
    handler: async ({ actions }, { events }) => {
      const sanitizedActions = actions.map((action) => ({
        ...action,
        url: validateKibanaUrl(action.url),
      }));

      events.sendUiEvent(SUGGESTED_ACTIONS_UI_EVENT, { actions: sanitizedActions });

      return {
        results: [
          createOtherResult({
            suggested_action_count: sanitizedActions.length,
            labels: sanitizedActions.map((a) => a.label),
          }),
        ],
      };
    },
  };
};
