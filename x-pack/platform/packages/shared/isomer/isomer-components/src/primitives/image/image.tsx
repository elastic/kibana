/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PrimitiveNode, Renderers } from '@elastic/isomer-sdk';
import { nodeAnchor, requiredString, sanitizeAssetUrl, z } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';

import {
  componentIcon,
  definePrimitive,
  plainText,
  SIZE,
  TEXT,
  snapshotMetrics,
  textHeight,
} from '../../lib';
import type { ComponentsPackTypes, ComponentsRenderContext } from '../../lib';
import { imageLabel } from './image_label';
import { imageSlackRenderer } from './image_slack';

const imageSchema = z.object({
  type: z.literal('image'),
  fileId: requiredString()
    .max(1024)
    .describe('The id of the image in the Files plugin. Each host resolves it.'),
  alt: plainText(SLACK_LIMITS.imageAltTextChars).describe(
    'What the image shows, for readers who cannot see it.'
  ),
  name: plainText(1024)
    .optional()
    .describe(
      'The image’s name, such as its file name. Shown when the image cannot be. Defaults to `alt`.'
    ),
});

/** An image stored in the Files plugin, by file id: each host resolves it to something it can show. */
export type ImageNode = z.infer<typeof imageSchema> & PrimitiveNode;

const example: ImageNode = {
  type: 'image',
  fileId: 'a1b2c3',
  alt: 'Checkout latency by region, over the last hour',
  name: 'checkout-latency.png',
};

// A picture frame with a hill and a sun.
const icon = componentIcon(
  ({ accent, muted }) =>
    `<rect x="2.5" y="3.5" width="11" height="9" rx="1" stroke="${muted}"/><path d="m3 11.5 3.5-3.5 2.5 2.5 1.5-1.5 3 2.5" stroke="${accent}"/><circle cx="10.5" cy="6" r="1" fill="${accent}"/>`
);

const { handles } = isomerDistillery.createStyleModule(
  'componentsImage',
  ({ css, tokens: { color, font, size } }) => ({
    root: css`
      margin: ${size.s} 0;
    `,
    image: css`
      display: block;
      max-width: 100%;
      height: auto;
    `,
    fallback: css`
      margin: ${size.s} 0;
      color: ${color.text.subdued};
      font-size: ${font.size.s};
      line-height: ${font.lineHeight.s};
    `,
  })
);

/** The URL the host resolves the file to, such as the Files blob route, if it passes the asset policy. */
const resolveSrc = ({ fileId }: ImageNode, context: ComponentsRenderContext): string | null => {
  const resolved = context.resolveFileUrl?.(fileId);
  return resolved ? sanitizeAssetUrl(resolved) : null;
};

const imageReactRenderer: Renderers<ImageNode, ComponentsPackTypes>['react'] = (
  node,
  { context }
) => {
  const src = resolveSrc(node, context);
  return src ? (
    <figure {...nodeAnchor(context, node)} className={classNames(context, handles.root)}>
      <img src={src} alt={node.alt} className={classNames(context, handles.image)} />
    </figure>
  ) : (
    <p {...nodeAnchor(context, node)} className={classNames(context, handles.fallback)}>
      {imageLabel(node)}
    </p>
  );
};

export const image = definePrimitive<ImageNode, typeof imageSchema>({
  type: 'image',
  schema: imageSchema,
  catalog: {
    type: 'image',
    purpose: 'An image the user attached or a tool stored, shown where the reader can see it.',
    useWhen: ['The message refers to an image stored in Kibana.'],
    avoidWhen: ['The image is on the web. Use a Markdown image in `markdown`.'],
    description:
      'An image in the Files plugin, by `fileId`, with `alt` text. A host that can show it does, and any other shows its `name`.',
    example,
  },
  icon,
  // The host resolves the file, which conformance doesn't supply; image.test.tsx covers that.
  examples: [example, { type: 'image', fileId: 'd4e5f6', alt: 'A screenshot of the error' }],
  // A server snapshot has no file resolver, so the image draws as its name.
  metrics: snapshotMetrics<ImageNode>(
    'image',
    (node) => textHeight(imageLabel(node), TEXT.s) + SIZE.s
  ),
  renderers: {
    react: imageReactRenderer,
    text: (node) => imageLabel(node),
    markdown: (node) => md.paragraph(imageLabel(node)),
    slack: imageSlackRenderer,
  },
});
