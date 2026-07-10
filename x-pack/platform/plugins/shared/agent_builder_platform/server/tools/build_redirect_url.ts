/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { encode } from '@kbn/rison';
import { addSpaceIdToPath } from '@kbn/core-spaces-common';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { CoreSetup } from '@kbn/core-lifecycle-server';

// A `flyout` panel maps to `@kbn/expandable-flyout` state: `id` is a registered panel key and
// `params` are that panel's props. Both are domain-specific, so the schema stays generic and the
// calling skill's instructions supply the exact values — the descriptions only tell the model to
// use what it was given rather than invent anything.
const flyoutPanelSchema = z.object({
  id: z.string().describe('The id of the panel to open in this slot.'),
  params: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "The panel's parameters. Substitute only the runtime values you were told to; omit when there are none."
    ),
});

export const buildRedirectUrlSchema = z.object({
  path: z
    .string()
    .describe(
      `The destination as an app-relative Kibana path, starting with a single "/" — e.g. "/app/security/entity_analytics_management/risk_score". Use a path the calling skill's instructions give you; do NOT invent or guess one. Do NOT include the deployment base path or the "/s/<space>" segment (the tool adds them), and do NOT pass an absolute URL (no "http://", "https://", or "//host"). May include its own query string; when it does and a "flyout" is also provided, the flyout is appended with "&".`
    ),
  flyout: z
    .object({
      left: flyoutPanelSchema.optional(),
      right: flyoutPanelSchema.optional(),
      preview: z.array(flyoutPanelSchema).optional(),
    })
    .optional()
    .describe(
      "A flyout to open on the destination page, given as `left` / `right` / `preview` panels. Only include this when the calling skill's instructions provide a flyout object, and copy its panels exactly. Leave unset otherwise."
    ),
});

/**
 * Serializes an expandable-flyout state object into a `flyout=<rison>` query param value.
 *
 * Two encodings are applied and they reverse cleanly on read:
 * 1. **Rison** (`encode`) → the compact wire format `@kbn/expandable-flyout` rison-decodes.
 * 2. **Percent-encoding** to make it a valid URL query value. We additionally escape the
 *    characters `encodeURIComponent` leaves raw (`! ' ( ) *`): the returned `url` is meant to be
 *    rendered inside a markdown link `[title](url)`, where literal parentheses/quotes break the
 *    link parser. Rison quotes any value containing `: @ .` with single quotes, so ids routinely
 *    produce `'`, `(`, and `)` here.
 *
 * On read, `new URLSearchParams(search).get('flyout')` percent-decodes, then the flyout code
 * rison-decodes — so both encodings reverse.
 */
const encodeFlyoutParam = (flyout: Record<string, unknown>): string =>
  encodeURIComponent(encode(flyout)).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );

/**
 * Generic navigation tool: turns an app-relative Kibana path (optionally with expandable-flyout
 * state) into a fully-qualified in-app URL, resolving the deployment base path and the active space segment
 */
export const buildRedirectUrlTool = (
  coreSetup: CoreSetup
): BuiltinToolDefinition<typeof buildRedirectUrlSchema> => ({
  id: platformCoreTools.buildRedirectUrl,
  type: ToolType.builtin,
  description: `Build a clickable in-app link that redirects the user to a specific Kibana page — use it when an action can't (or shouldn't) be performed in chat and the user needs to complete it in the UI.

**Only call this tool when a skill's instructions explicitly tell you to redirect the user and give you the destination.** The \`path\` (and any \`flyout\`) must come from those instructions — never construct, guess, or infer a Kibana path yourself. If no skill provided a destination, do not call this tool; a made-up path leads to a broken link.

Returns a single \`url\`. Render it in your reply as a markdown link \`[title](url)\`, using the returned \`url\` as-is (do not edit it).

- \`path\`: the app-relative path (starting with "/"), without the base path or space segment — the tool adds those for the current deployment and space.
- \`flyout\` (optional): the \`left\` / \`right\` / \`preview\` panels to open on the target page. The tool encodes them into the URL.

This tool only builds a link; it performs no action.`,
  schema: buildRedirectUrlSchema,
  handler: async ({ path, flyout }, { spaceId, logger }) => {
    if (!path.startsWith('/') || path.startsWith('//')) {
      return {
        results: [
          {
            type: ToolResultType.error as const,
            data: {
              message: `'path' must be an app-relative path starting with a single "/" (got: ${path}). Absolute or protocol-relative URLs are not allowed.`,
            },
          },
        ],
      };
    }

    let relativePath = path;
    if (flyout && (flyout.left || flyout.right || flyout.preview)) {
      const separator = relativePath.includes('?') ? '&' : '?';
      relativePath = `${relativePath}${separator}flyout=${encodeFlyoutParam(flyout)}`;
    }

    const [coreStart] = await coreSetup.getStartServices();
    const url = addSpaceIdToPath(coreStart.http.basePath.serverBasePath, spaceId, relativePath);

    logger.debug(`${platformCoreTools.buildRedirectUrl} built redirect url for path '${path}'`);

    return {
      results: [
        {
          type: ToolResultType.other,
          data: { url },
        },
      ],
    };
  },
  tags: ['navigation', 'ui'],
});
