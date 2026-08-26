/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const FALLBACK_BASENAME = 'view';
const MAX_BASENAME_LENGTH = 64;

/**
 * Derives a download basename from a view title: lowercase, ASCII word
 * characters joined by single hyphens.
 */
export const slugifyTitle = (title: string | undefined): string => {
  const slug = (title ?? '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, MAX_BASENAME_LENGTH)
    .replace(/-+$/g, '');

  return slug || FALLBACK_BASENAME;
};

/** Triggers a browser download of `content` under `filename`. */
export const downloadBlob = (content: BlobPart, filename: string, type: string): void => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
