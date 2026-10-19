/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { nodeAnchor, structuredValueSchema, z } from '@elastic/isomer-sdk';
import { fromChildren } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';

import { componentIcon, definePrimitive, plainText } from '../../lib';
import { fieldEntries } from './field_entries';
import { fieldsSlackRenderer } from './fields_slack';

const itemSchema = z
  .object({
    label: plainText(100).describe('What the value is, in plain text, such as "Time range".'),
    value: z
      .union([plainText(1000), structuredValueSchema])
      .describe(
        'The value: plain text, or `{ raw, format?, precision?, currency? }` to format a number or date the same on every surface.'
      ),
  })
  .strict();

const fieldsSchema = z.object({
  type: z.literal('fields'),
  items: fromChildren(
    'item',
    z
      .array(itemSchema)
      .min(1)
      .max(SLACK_LIMITS.fieldsPerSection)
      .describe('Labeled values, in order. 1 to 10.'),
    { text: 'value' }
  ),
});

/** Labeled values, such as a skill's tools or a screen's app and time range. */
export type FieldsNode = z.infer<typeof fieldsSchema> & PrimitiveNode;

const example: FieldsNode = {
  type: 'fields',
  items: [
    { label: 'App', value: 'Discover' },
    { label: 'Time range', value: 'Last 15 minutes' },
  ],
};

// Two label and value rows.
const icon = componentIcon(
  ({ accent, muted }) =>
    `<path d="M2.75 5h3M2.75 11h3" stroke="${accent}"/><path d="M8.25 5h5M8.25 11h4" stroke="${muted}"/>`
);

const { handles } = isomerDistillery.createStyleModule(
  'componentsFields',
  ({ css, tokens: { color, font, size } }) => ({
    root: css`
      display: grid;
      grid-template-columns: max-content 1fr;
      column-gap: ${size.m};
      row-gap: ${size.xs};
      margin: ${size.m} 0;
      font-size: ${font.size.s};
      line-height: ${font.lineHeight.s};
    `,
    label: css`
      margin: 0;
      color: ${color.text.subdued};
      font-weight: ${font.weight.semiBold};
    `,
    value: css`
      margin: 0;
      color: ${color.text.paragraph};
      overflow-wrap: anywhere;
    `,
  })
);

export const fields = definePrimitive<FieldsNode, typeof fieldsSchema>({
  type: 'fields',
  schema: fieldsSchema,
  catalog: {
    type: 'fields',
    purpose: 'Short labeled values, shown as pairs, such as an app, a URL, or a time range.',
    useWhen: ['The content is a few facts, each with a name and a value.'],
    avoidWhen: [
      'The facts share columns across many rows. Use a `table`.',
      'The facts are secondary to the message. Use `context`.',
    ],
    example,
  },
  icon,
  examples: [
    example,
    {
      type: 'fields',
      items: [
        { label: 'Documents', value: { raw: 1284000, format: 'compact' } },
        { label: 'Index size', value: { raw: 5368709120, format: 'bytes' } },
        { label: 'Error rate', value: { raw: 0.042, format: 'percent' } },
      ],
    },
  ],
  renderers: {
    react: (node, { context }) => (
      <dl {...nodeAnchor(context, node)} className={classNames(context, handles.root)}>
        {fieldEntries(node).map(({ label, value }, index) => (
          <Fragment key={index}>
            <dt className={classNames(context, handles.label)}>{label}</dt>
            <dd className={classNames(context, handles.value)}>{value}</dd>
          </Fragment>
        ))}
      </dl>
    ),
    text: (node) =>
      fieldEntries(node)
        .map(({ label, value }) => `${label}: ${value}`)
        .join('\n'),
    markdown: (node) =>
      md.list(
        fieldEntries(node).map(({ label, value }) => md.paragraph(md.strong(label), ': ', value))
      ),
    slack: fieldsSlackRenderer,
  },
});
