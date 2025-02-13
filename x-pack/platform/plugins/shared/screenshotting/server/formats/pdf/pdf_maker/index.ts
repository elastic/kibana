/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '@kbn/core/server';
import type { Layout } from '../../../layouts';
import type { CaptureResult } from '../../../screenshots';
import { Actions, EventLogger, Transactions } from '../../../screenshots/event_logger';
import { PdfMaker } from './pdfmaker';

interface PngsToPdfArgs {
  results: CaptureResult['results'];
  layout: Layout;
  packageInfo: PackageInfo;
  eventLogger: EventLogger;
  logo?: string;
  title?: string;
}

export async function pngsToPdf({
  results,
  layout,
  logo,
  title,
  packageInfo,
  eventLogger,
}: PngsToPdfArgs): Promise<{ buffer: Buffer; pages: number }> {
  const { kbnLogger } = eventLogger;
  const transactionEnd = eventLogger.startTransaction(Transactions.PDF);

  let buffer: Uint8Array | null = null;
  let pdfMaker: PdfMaker | null = null;
  try {
    pdfMaker = new PdfMaker(layout, logo, packageInfo, kbnLogger);
    if (title) {
      pdfMaker.setTitle(title);
    }
    results.forEach((result) => {
      result.screenshots.forEach((png) => {
        const spanEnd = eventLogger.logPdfEvent(
          'add image to PDF file',
          Actions.ADD_IMAGE,
          'output'
        );
        pdfMaker?.addImage(png.data, {
          title: png.title ?? undefined,
          description: png.description ?? undefined,
        });
        spanEnd();
      });
    });

    const spanEnd = eventLogger.logPdfEvent('compile PDF file', Actions.COMPILE, 'output');
    buffer = await pdfMaker.generate();
    spanEnd();

    const byteLength = buffer?.byteLength ?? 0;
    transactionEnd({ labels: { byte_length_pdf: byteLength, pdf_pages: pdfMaker.getPageCount() } });
  } catch (error) {
    kbnLogger.error(error);
    eventLogger.error(error, Actions.COMPILE);
    throw error;
  }

  return { buffer: Buffer.from(buffer.buffer), pages: pdfMaker.getPageCount() };
}
