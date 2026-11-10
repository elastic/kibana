/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DownloadedFile } from '../api';

/** Saves a downloaded file through a temporary object URL. */
export function saveFile({ blob, filename }: DownloadedFile): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

interface HttpErrorBody {
  body?: { message?: string };
}

/** Extracts the server-provided message from an HTTP fetch error, falling back to the Error message. */
export function getErrorMessage(error: Error): string {
  const { body } = error as Error & HttpErrorBody;
  return body?.message ?? error.message;
}
