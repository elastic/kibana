/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { lazySchema, z } from '@kbn/zod/v4';
import type { KibanaIsomerRuntime } from '@kbn/isomer-plugin/server';

export const RENDER_COMPOSITION_TOOL_ID = `${internalNamespaces.platformIsomer}.render_composition`;

const SURFACES = ['markdown', 'text', 'slack', 'html'] as const;

export const MAX_COMPOSITION_CHARS = 2_000_000;
const MAX_BODY_NODES = 50;

const schema = lazySchema(() =>
  z.object({
    composition: z
      .object({
        type: z.literal('view'),
        title: z.string().max(500).optional().describe('Heading shown above the body.'),
        subtitle: z.string().max(500).optional().describe('Line shown under the title.'),
        body: z
          .array(
            z.looseObject({ type: z.string().max(64).describe('The primitive this node is.') })
          )
          .min(1)
          .max(MAX_BODY_NODES)
          .describe('Nodes rendered in order. Each has a `type` naming its primitive.'),
      })
      .describe('The Isomer composition to render.'),
    surface: z
      .enum(SURFACES)
      .default('markdown')
      .describe(
        '`markdown` or `text` for prose, `slack` for Block Kit (`text` and `blocks`), `html` for inline-SVG markup.'
      ),
  })
);

const render = (
  runtime: KibanaIsomerRuntime,
  composition: Composition,
  surface: (typeof SURFACES)[number]
) => {
  const { surfaces } = runtime;
  switch (surface) {
    case 'markdown':
      return surfaces.markdown.render(composition);
    case 'text':
      return surfaces.text.render(composition);
    case 'slack': {
      const { text, blocks } = surfaces.slack.render(composition);
      return { text, blocks };
    }
    case 'html':
      return surfaces.html.render(composition).html;
  }
};

const errorResult = (message: string) => ({
  results: [{ type: ToolResultType.error, data: { message } }],
});

/** Validates an Isomer composition and renders it to one surface, through the `isomer` plugin's runtime. */
export const createRenderCompositionTool = ({
  getRuntime,
}: {
  getRuntime: () => Promise<KibanaIsomerRuntime>;
}): BuiltinToolDefinition<typeof schema> => ({
  id: RENDER_COMPOSITION_TOOL_ID,
  type: ToolType.builtin,
  annotations: {
    title: 'Render Isomer composition',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  description: `Validate an Isomer composition and render it to Markdown, plain text, Slack Block Kit, or HTML.

**When to use:** To check that a composition is valid, or to turn one into a format for a destination, such as Markdown for a document or Block Kit for Slack.

A composition is \`{ type: 'view', title?, subtitle?, body: [node, ...] }\`. A \`markdown\` node, \`{ type: 'markdown', text }\`, is always supported; a node of an unsupported type returns an error that lists the supported types.

Returns the rendered output for \`surface\`, or the validation errors with the path of each.`,
  schema,
  tags: ['platform', 'isomer'],
  handler: async ({ composition, surface }) => {
    if (JSON.stringify(composition).length > MAX_COMPOSITION_CHARS) {
      return errorResult(
        `The composition is longer than ${MAX_COMPOSITION_CHARS} characters of JSON.`
      );
    }

    const [runtime, { formatValidationError }] = await Promise.all([
      getRuntime(),
      import('@elastic/isomer-sdk'),
    ]);

    const { valid, composition: checked, errors } = runtime.validate(composition);
    if (!valid || !checked) {
      return errorResult(
        `The composition is invalid: ${errors.map(formatValidationError).join('; ')}`
      );
    }

    return {
      results: [
        {
          type: ToolResultType.other,
          data: { surface, output: render(runtime, checked, surface) },
        },
      ],
    };
  },
});
