/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';

const URL = '/internal/file_upload/preview_pdf_contents';

export async function previewPDF(http: HttpSetup, data: ArrayBuffer) {
  const dataString: string = [].reduce.call(
    new Uint8Array(data),
    (p, c) => {
      return p + String.fromCharCode(c);
    },
    ''
  ) as string;
  const pdfBase64 = btoa(dataString);

  const { preview } = await http.fetch<any>(URL, {
    method: 'POST',
    version: '1',
    body: JSON.stringify({
      pdfBase64,
    }),
  });
  return preview;
}
