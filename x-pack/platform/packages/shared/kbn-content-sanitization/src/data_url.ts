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

const isC0ControlOrSpace = (char: string) => char.charCodeAt(0) <= 0x20;

/**
 * Mirrors the WHATWG URL preprocessing browsers apply before parsing: leading and trailing C0
 * controls and spaces are trimmed, and ASCII tab and newline characters are removed everywhere.
 */
const normalizeUrl = (url: string): string => {
  const chars = Array.from(url);
  const start = chars.findIndex((char) => !isC0ControlOrSpace(char));
  if (start === -1) {
    return '';
  }
  const end =
    chars.length -
    chars
      .slice()
      .reverse()
      .findIndex((char) => !isC0ControlOrSpace(char));
  return chars
    .slice(start, end)
    .join('')
    .replace(/[\t\n\r]/g, '');
};

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
  const match = DATA_URL_REGEX.exec(normalizeUrl(dataUrl));
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
    // The payload is percent-decoded first, so escaped base64 characters (such as `%3D`) decode
    // the same way a browser decodes them.
    svgContent = Buffer.from(
      decodeURIComponent(payload),
      params.includes('base64') ? 'base64' : 'utf8'
    );
  } catch (error) {
    throw new Error(`Failed to decode SVG data URL: ${error.message}`);
  }

  return `data:${SVG_MIME_TYPE};base64,${sanitizeSvg(svgContent).toString('base64')}`;
}
