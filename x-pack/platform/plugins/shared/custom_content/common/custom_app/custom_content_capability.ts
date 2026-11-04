/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  CUSTOM_CONTENT_MAX_HEIGHT,
  CUSTOM_CONTENT_MIN_HEIGHT,
  CUSTOM_CONTENT_SCRIPT_PATTERN,
} from '@kbn/custom-content-common';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { MAX_PROMPT_LENGTH, MAX_TEMPLATE_LENGTH, querySchema } from '@kbn/custom-app-common';

export const customContentCapability = defineCapability({
  kind: 'component',
  id: 'custom_content',
  version: 1,
  props: lazySchema(() =>
    z.object({
      query: querySchema
        .optional()
        .describe(
          'An ES|QL query whose rows fill the template. Without one the template is shown as it is.'
        ),
      template: z
        .string()
        .max(MAX_TEMPLATE_LENGTH)
        .optional()
        .describe(
          'The HTML with Liquid in it. Do not write it: describe what you want in "prompt".'
        ),
      height: z
        .number()
        .int()
        .min(CUSTOM_CONTENT_MIN_HEIGHT)
        .max(CUSTOM_CONTENT_MAX_HEIGHT)
        .optional()
        .describe('How tall the frame needs to be. It is set with the template.'),
      prompt: z
        .string()
        .min(1)
        .max(MAX_PROMPT_LENGTH)
        .optional()
        .describe(
          'What the template should show. Whoever receives the document turns it into the template.'
        ),
    })
  ),
  doc: {
    summary:
      'your own HTML layout (a status board, KPI cards, a styled list) filled with the rows of its query. NEVER write the HTML yourself: put what you want in "prompt" and the server writes the template and its height, with the real columns of the query in front of it. To change an existing one, keep its "template" and "height" as they are and add a "prompt" with only the change; to keep it as it is, leave "prompt" out. Prefer stat, chart and table for what they cover; use this for what they cannot express. Use custom_content for what is only to be looked at and has a layout of its own: a banner or cover at the top of a page, a styled quote, a status board, a gallery of KPI cards, a custom legend. It cannot be pressed or changed by the person and cannot hold other components. For anything people interact with (filters, buttons, forms, switches, tabs, tables, charts) use the native components next to it, which follow the theme and the values of the app, and let the native components set values that the custom content\'s query reads as ?name.',
    whenToUse:
      'For what is only to be looked at and has a layout of its own. For anything people interact with use the native components.',
    example: {
      type: 'custom_content',
      id: 'banner',
      prompt: 'A banner with the title of the report',
      template: '<h1>Weekly report</h1>',
    },
  },
  data: 'query',
  validate: (node, { issue }) => {
    if (!node.template?.trim()) {
      issue(`Node "${node.id}" has no template; describe what it should show in its "prompt"`);
    } else if (CUSTOM_CONTENT_SCRIPT_PATTERN.test(node.template)) {
      issue(
        `Node "${node.id}" has a template with a script in it; it is shown with scripting off, so write it as plain HTML`
      );
    }
  },
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    custom_content: CapabilityNodeOf<typeof customContentCapability>;
  }
}

/** What a custom content component of an app holds. */
export type CustomContentNode = CapabilityNodeOf<typeof customContentCapability>;
