/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PrimitiveNode, StyledRenderContext } from '@elastic/isomer-sdk';
import {
  navigationHref,
  nodeAnchor,
  requiredString,
  sanitizeNavigationHref,
  z,
} from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { componentIcon, definePrimitive } from '../../lib';

const unsupportedSchema = z
  .object({
    type: z.literal('unsupported'),
    title: z.string().max(500).optional(),
    reason: requiredString().max(10_000),
    link: z
      .object({
        href: navigationHref({ max: 2000 }),
        label: requiredString().max(300),
      })
      .strict()
      .optional(),
  })
  .strict();

/** A renderable explanation for content a host cannot materialize. */
export type UnsupportedNode = z.infer<typeof unsupportedSchema> & PrimitiveNode;

const example: UnsupportedNode = {
  type: 'unsupported',
  title: 'Unsupported visualization',
  reason: 'This visualization cannot be shown here.',
};

const icon = componentIcon(
  ({ accent, fg }) =>
    `<path d="M8 3v5M8 11v.25" stroke="${accent}"/><path d="M2.5 8a5.5 5.5 0 1 0 11 0 5.5 5.5 0 1 0-11 0Z" stroke="${fg}"/>`
);

const text = ({ title, reason, link }: UnsupportedNode): string =>
  [title, reason, link ? `${link.label}: ${link.href}` : undefined]
    .filter((value): value is string => value !== undefined)
    .join('\n');

const markdown = ({ title, reason, link }: UnsupportedNode) => [
  ...(title ? [md.heading(4, md.text(title))] : []),
  md.paragraph(md.text(reason)),
  ...(link ? [md.paragraph(md.link(link.label, link.href))] : []),
];

const react = (
  node: UnsupportedNode,
  { context }: { context: StyledRenderContext }
): React.ReactElement => {
  const href = node.link ? sanitizeNavigationHref(node.link.href) : null;
  return (
    <div {...nodeAnchor(context, node)} role="status">
      {node.title ? <strong>{node.title}</strong> : null}
      <p>{node.reason}</p>
      {node.link && href ? (
        <p>
          <a href={href}>{node.link.label}</a>
        </p>
      ) : null}
    </div>
  );
};

/** Isomer primitive for materialization failures; preserves the reason on each render surface. */
export const unsupported = definePrimitive<UnsupportedNode, typeof unsupportedSchema>({
  type: 'unsupported',
  schema: unsupportedSchema,
  catalog: {
    type: 'unsupported',
    purpose: 'A readable explanation when content cannot be materialized.',
    useWhen: ['The host cannot produce a supported node for the requested content.'],
    avoidWhen: [],
    example,
  },
  icon,
  examples: [example],
  renderers: {
    react,
    text,
    markdown,
  },
});
