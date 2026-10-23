/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'node:path';
import { fromRoot } from '@kbn/repo-info';

import { createPdfWriter } from './pdf_writer';

const fonts = [
  join(
    fromRoot('src/core/packages/apps/server-internal/assets/fonts'),
    'inter/Inter-Regular.woff2'
  ),
];
const page = {
  pages: [{ html: '<div style="font-family: Inter">Flights</div>' }],
  css: '',
  width: 200,
  height: 100,
};

describe('createPdfWriter', () => {
  it('writes PDFs in a worker, one after another, and rejects after close', async () => {
    const writer = createPdfWriter({ fonts });
    try {
      const [first, second] = await Promise.all([writer.write(page), writer.write(page)]);
      for (const pdf of [first, second]) {
        expect(Buffer.isBuffer(pdf)).toBe(true);
        expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      }
    } finally {
      await writer.close();
    }
    await expect(writer.write(page)).rejects.toThrow(/closed/);
  });

  it('rejects a document the thread cannot write, and keeps writing', async () => {
    const writer = createPdfWriter({ fonts });
    try {
      await expect(writer.write({ ...page, pages: [] })).rejects.toThrow(/no pages/);
      await expect(writer.write(page)).resolves.toBeInstanceOf(Buffer);
    } finally {
      await writer.close();
    }
  });
});
