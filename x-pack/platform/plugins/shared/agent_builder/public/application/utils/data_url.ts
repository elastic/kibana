/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const BASE64_DATA_URL_PATTERN = /^data:([^;,]+);base64,(.*)$/;

export interface ParsedDataUrl {
  mediaType: string;
  data: string;
}

/**
 * Parses a base64 `data:` URL into its media type and raw base64 payload.
 *
 * Only base64-encoded data URLs of the form `data:<mediaType>;base64,<data>`
 * are recognized; this is the only form produced by webpack asset inlining
 * and `FileReader.readAsDataURL`.
 *
 * @param dataUrl - The string to parse, e.g. `"data:image/png;base64,iVBORw0K..."`.
 * @returns An object with `mediaType` and raw base64 `data`, or `null` when
 *   the input isn't a recognized base64 data URL.
 */
export const parseDataUrl = (dataUrl: string): ParsedDataUrl | null => {
  const match = BASE64_DATA_URL_PATTERN.exec(dataUrl);
  if (!match) {
    return null;
  }
  const [, mediaType, data] = match;
  return { mediaType, data };
};

/**
 * Reads a `Blob` (or `File`) as a base64 `data:` URL via `FileReader`.
 *
 * @param blob - The `Blob` or `File` to read.
 * @returns A promise resolving to the full data URL
 *   (`data:<mediaType>;base64,<data>`).
 * @throws If the underlying `FileReader` errors or yields a non-string result.
 */
export const readBlobAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const { result } = reader;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }
      reject(new Error('FileReader did not return a string'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed to read blob'));
    reader.readAsDataURL(blob);
  });

/**
 * Fetches a resource and returns its contents as a base64 `data:` URL.
 * Short-circuits when given a `data:` URL since webpack inlines small assets
 * that way.
 *
 * The `signal` is forwarded to `fetch` only. The subsequent `FileReader` step
 * does not honor it, so callers that race multiple invocations should also
 * check `signal.aborted` after awaiting the result before committing it.
 *
 * @param url - Either a regular URL to fetch or an existing `data:` URL.
 * @param signal - Optional abort signal to cancel the in-flight `fetch`.
 * @returns A promise resolving to a base64 data URL
 *   (`data:<mediaType>;base64,<data>`).
 * @throws If the resource cannot be fetched or read, including when aborted.
 */
export const fetchAsDataUrl = async (url: string, signal?: AbortSignal): Promise<string> => {
  if (url.startsWith('data:')) {
    return url;
  }

  const response = await fetch(url, { signal });
  const blob = await response.blob();
  return readBlobAsDataUrl(blob);
};
