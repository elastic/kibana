/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_PDF_PAGES } from '@kbn/agent-builder-common/attachments';

// POC: remove when EIS accepts PDF
/**
 * Renders every page of a PDF to a PNG, returned as base64 strings.
 */
export const pdfToImages = async (buffer: Buffer): Promise<string[]> => {
  // ESM-only package, loaded lazily
  const { pdf } = await import('pdf-to-img');
  // scale 1 is 72 DPI, too small for OCR
  const doc = await pdf(buffer, { scale: 2 });
  try {
    if (doc.length > MAX_PDF_PAGES) {
      throw new Error(`PDF has ${doc.length} pages, the limit is ${MAX_PDF_PAGES}`);
    }
    const pages: string[] = [];
    for await (const png of doc) {
      pages.push(png.toString('base64'));
    }
    return pages;
  } finally {
    await doc.destroy();
  }
};
