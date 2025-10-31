/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

function isBase64Encoded(str: unknown): boolean {
  if (typeof str !== 'string' || str.length === 0) {
    return false;
  }

  try {
    // Check if the string can be converted to a Buffer with 'base64' encoding
    // and then back to base64, comparing it with the original.
    // This ensures it's a valid Base64 string and not just random characters.
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch (e) {
    return false;
  }
}

export function sanitizeSvg(svgContent: Buffer): Buffer {
  try {
    // Convert buffer to string
    const svgString = svgContent.toString('utf8');

    // Check if the content is base64 encoded
    let contentToSanitize = svgString;
    if (isBase64Encoded(svgString)) {
      try {
        const decoded = Buffer.from(svgString, 'base64').toString('utf8');
        // Simple verification that it looks like SVG content
        if (decoded.includes('<svg') || decoded.includes('<?xml')) {
          contentToSanitize = decoded;
        }
      } catch (decodeError) {
        // If decoding fails, use the original content
        return svgContent;
      }
    }

    // Create a DOM environment
    const window = new JSDOM('').window;
    const purify = DOMPurify(window);

    // Configure DOMPurify for SVG
    purify.setConfig({
      USE_PROFILES: { svg: true, svgFilters: true },
      ADD_TAGS: ['svg', 'path', 'circle', 'rect', 'line', 'g', 'defs'],
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'foreignObject'],
      FORBID_ATTR: [
        'onerror',
        'onload',
        'onclick',
        'onmouseover',
        'eval',
        'javascript',
        'formaction',
        'xlink:href',
        'href',
        'src',
        'data',
      ],
    });

    // Sanitize and convert the result back to a Buffer
    return Buffer.from(purify.sanitize(contentToSanitize), 'utf8');
  } catch (error) {
    throw new Error(`SVG sanitization failed: ${error.message}`);
  }
}

module.exports = {
  sanitizeSvg,
  isBase64Encoded,
};
