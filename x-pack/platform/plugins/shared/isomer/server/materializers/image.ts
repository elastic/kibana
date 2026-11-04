/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lazySchema, z } from '@kbn/zod';
import type { Materializer } from '../materialize/types';
import { createUnsupportedNode } from '../materialize/unsupported';
import { escapeMarkdownText, isAbsoluteHttpUrl, markdownDestination } from './markdown_text';

export const IMAGE_PANEL_TYPE = 'image';

/** An Image panel's as-code config: the image embeddable's `image_config`, and the panel title. */
const imageConfigSchema = lazySchema(() =>
  z
    .object({
      title: z.string().optional(),
      image_config: z
        .object({
          src: z.discriminatedUnion('type', [
            z.object({ type: z.literal('file'), file_id: z.string() }).loose(),
            z.object({ type: z.literal('url'), url: z.string() }).loose(),
          ]),
          alt_text: z.string().optional(),
        })
        .loose(),
    })
    .loose()
);

export type ImageConfig = z.output<typeof imageConfigSchema>;

const fileReason = () =>
  i18n.translate('xpack.isomer.materialize.image.file', {
    defaultMessage: 'Images uploaded to Kibana cannot be shown here yet.',
  });

const urlReason = () =>
  i18n.translate('xpack.isomer.materialize.image.url', {
    defaultMessage: 'Only images at an absolute http or https URL can be shown here.',
  });

/**
 * Materializes a dashboard Image panel by value. An image at a URL becomes a components pack
 * `markdown` image with its alt text. An image uploaded to Kibana is a file only an authenticated
 * Kibana request can read, so it's `unsupported` until the components pack has an `image` that
 * takes a file ID.
 */
export const createImageMaterializer = (): Materializer<ImageConfig> => ({
  version: 1,

  parse: (config) => imageConfigSchema.parse(config),

  describe: ({ title }) => (title ? { title } : {}),

  plan: ({ title, image_config: { src } }) => {
    if (src.type === 'file') {
      return createUnsupportedNode(fileReason(), { title });
    }
    return isAbsoluteHttpUrl(src.url) ? [] : createUnsupportedNode(urlReason(), { title });
  },

  map: ({ image_config: { src, alt_text: altText } }) => {
    if (src.type !== 'url') {
      return createUnsupportedNode(fileReason());
    }
    return {
      type: 'markdown',
      text: `![${escapeMarkdownText(altText ?? '')}](${markdownDestination(src.url)})`,
    };
  },
});
