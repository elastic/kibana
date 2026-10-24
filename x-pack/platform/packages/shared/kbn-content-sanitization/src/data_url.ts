/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeSvg } from './svg';

const SVG_MIME_TYPE = 'image/svg+xml';

// RFC 2397: data:[<mediatype>][;base64],<data>
const DATA_URL_REGEX = /^data:([^,]*),([\s\S]*)$/i;

/**
 * Sanitizes an SVG image carried in a `data:` URL (e.g. an avatar stored as a saved object or user
 * profile attribute). Browsers only render a data URL as SVG when its media type is `image/svg+xml`,
 * so any other value - a raster data URL, a non-data URL, an empty string - is returned unchanged.
 *
 * SVG data URLs are decoded (base64 or percent-encoded), passed through {@link sanitizeSvg}, and
 * re-encoded as a base64 `data:image/svg+xml;base64,...` URL.
 *
 * @throws if the SVG payload cannot be decoded or sanitized.
 */
export function sanitizeImageDataUrl(dataUrl: string): string {
  const match = DATA_URL_REGEX.exec(dataUrl);
  if (!match) {
    return dataUrl;
  }

  const [, header, payload] = match;
  const [mimeType, ...params] = header.split(';').map((part) => part.trim().toLowerCase());
  if (mimeType !== SVG_MIME_TYPE) {
    return dataUrl;
  }

  let svgContent: Buffer;
  try {
    svgContent = params.includes('base64')
      ? Buffer.from(payload, 'base64')
      : Buffer.from(decodeURIComponent(payload), 'utf8');
  } catch (error) {
    throw new Error(`Failed to decode SVG data URL: ${error.message}`);
  }

  return `data:${SVG_MIME_TYPE};base64,${sanitizeSvg(svgContent).toString('base64')}`;
}
