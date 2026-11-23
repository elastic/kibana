/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Returns the markup of an SVG data URL, or undefined for other or malformed URLs. */
export const decodeSvgDataUrl = (dataUrl: string): string | undefined => {
  if (!dataUrl.startsWith('data:image/svg+xml')) {
    return undefined;
  }
  const commaIndex = dataUrl.indexOf(',');
  const data = dataUrl.slice(commaIndex + 1);
  try {
    return dataUrl.slice(0, commaIndex).endsWith(';base64') ? atob(data) : decodeURIComponent(data);
  } catch {
    // Some data URLs are malformed (e.g. FALLBACK_BOLT_DATA_URL has invalid base64).
    return undefined;
  }
};
