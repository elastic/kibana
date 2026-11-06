/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { promises as dns } from 'dns';
import type { Logger } from '@kbn/core/server';
import {
  CONNECTOR_TYPE_ICON_MAX_BYTES,
  CONNECTOR_TYPE_ICON_MIME_TYPES,
} from '@kbn/actions-plugin/common';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { fetchPublicResource } from '../generate_connector_type/fetch_documentation';
import { GenerateConnectorTypeError } from '../generate_connector_type/types';

const ALLOWED_CONTENT_TYPES: ReadonlySet<string> = new Set(CONNECTOR_TYPE_ICON_MIME_TYPES);
const ACCEPT_HEADER = CONNECTOR_TYPE_ICON_MIME_TYPES.join(', ');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const startsWith = (bytes: Buffer, signature: Buffer) =>
  bytes.length >= signature.length && bytes.subarray(0, signature.length).equals(signature);

/** Checks that the bytes are what the server said they are, so a mislabelled body is not kept. */
const matchesMediaType = (mediaType: string, bytes: Buffer): boolean => {
  switch (mediaType) {
    case 'image/png':
      return startsWith(bytes, PNG_SIGNATURE);
    case 'image/jpeg':
      return startsWith(bytes, Buffer.from([0xff, 0xd8, 0xff]));
    case 'image/gif':
      return ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('latin1'));
    case 'image/webp':
      return (
        bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
        bytes.subarray(8, 12).toString('latin1') === 'WEBP'
      );
    case 'image/svg+xml':
      return /<svg[\s>]/i.test(bytes.toString('utf8'));
    case 'image/x-icon':
    case 'image/vnd.microsoft.icon':
      return (
        bytes.length >= 6 &&
        startsWith(bytes, Buffer.from([0, 0, 1, 0])) &&
        bytes.readUInt16LE(4) > 0
      );
    default:
      return false;
  }
};

const readBytes = async (response: {
  arrayBuffer?: () => Promise<ArrayBuffer>;
  data?: unknown;
}): Promise<Buffer> =>
  typeof response.arrayBuffer === 'function'
    ? Buffer.from(await response.arrayBuffer())
    : Buffer.from(String(response.data ?? ''));

/**
 * Fetches an image from a public URL and returns it as a base64 `data:` URI. The browser cannot
 * load arbitrary image URLs (the CSP only allows same-origin and `data:` images), and a URL says
 * nothing about the size of what it serves, so the server reads the image once and keeps the bytes.
 */
export const fetchConnectorTypeLogo = async ({
  url,
  configurationUtilities,
  logger,
  fetch,
  lookup,
}: {
  url: string;
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
  fetch?: Parameters<typeof fetchPublicResource>[0]['fetch'];
  lookup?: typeof dns.lookup;
}): Promise<string> =>
  fetchPublicResource({
    url,
    configurationUtilities,
    logger,
    fetch,
    lookup,
    accept: ACCEPT_HEADER,
    allowedContentTypes: ALLOWED_CONTENT_TYPES,
    maxContentLength: CONNECTOR_TYPE_ICON_MAX_BYTES,
    read: async (response, { mediaType }) => {
      const bytes = await readBytes(response);
      if (bytes.length > CONNECTOR_TYPE_ICON_MAX_BYTES) {
        throw new GenerateConnectorTypeError(
          'too_large',
          `The logo exceeds the ${CONNECTOR_TYPE_ICON_MAX_BYTES / 1024} KB limit.`,
          400
        );
      }
      if (bytes.length === 0 || !matchesMediaType(mediaType, bytes)) {
        throw new GenerateConnectorTypeError(
          'unsupported_content',
          `The response is not a valid ${mediaType} image.`,
          400
        );
      }
      return `data:${mediaType};base64,${bytes.toString('base64')}`;
    },
  });
