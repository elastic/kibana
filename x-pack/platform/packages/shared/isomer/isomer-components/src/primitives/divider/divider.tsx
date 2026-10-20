/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { nodeAnchor, z } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';
import { componentIcon, definePrimitive, BORDER, SIZE, snapshotMetrics } from '../../lib';

const dividerSchema = z.object({
  type: z.literal('divider'),
});

/** A rule between two sections of a message. */
export type DividerNode = z.infer<typeof dividerSchema> & PrimitiveNode;

const example: DividerNode = { type: 'divider' };

// A rule between two blocks of lines.
const icon = componentIcon(
  ({ accent, muted }) =>
    `<path d="M4 4h8M4 12h8" stroke="${muted}"/><path d="M2.5 8h11" stroke="${accent}"/>`
);

const { handles } = isomerDistillery.createStyleModule(
  'componentsDivider',
  ({ css, tokens: { border, color, size } }) => ({
    root: css`
      margin: ${size.l} 0;
      border: none;
      border-top: ${border.width.thin} solid ${color.border.subdued};
    `,
  })
);

export const divider = definePrimitive<DividerNode, typeof dividerSchema>({
  type: 'divider',
  schema: dividerSchema,
  catalog: {
    type: 'divider',
    purpose: 'Creates a deliberate break between sections of a message.',
    useWhen: ['A message splits into genuinely separate sections.'],
    avoidWhen: [
      'A `header` already starts the next section.',
      'The message is one short sequence of nodes; most messages need no divider.',
    ],
    example,
  },
  icon,
  examples: [example],
  metrics: snapshotMetrics<DividerNode>('divider', () => BORDER.thin + SIZE.l),
  renderers: {
    react: (node, { context }) => (
      <hr {...nodeAnchor(context, node)} className={classNames(context, handles.root)} />
    ),
    text: () => '---',
    markdown: () => md.authored('---'),
    slack: () => ({ type: 'divider' }),
  },
});
