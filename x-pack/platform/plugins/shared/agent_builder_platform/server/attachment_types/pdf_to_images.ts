/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';
import { setImmediate } from 'timers/promises';
import type { WrappedPdfiumModule } from '@embedpdf/pdfium';
import { MAX_PDF_PAGES } from '@kbn/agent-builder-common/attachments';

// scale 1 is 72 DPI, too small for OCR
const RENDER_SCALE = 2;
// keeps big-format pages (posters, drawings) from using too much memory
const MAX_RENDER_SIDE_PX = 2000;

// PDFium flags and codes, see fpdfview.h
const FPDF_ANNOT = 0x01;
const FPDF_REVERSE_BYTE_ORDER = 0x10;
// draw annotations + RGBA instead of BGRA, as the PNG encoder expects (bit flags, sum = OR)
const RENDER_FLAGS = FPDF_ANNOT + FPDF_REVERSE_BYTE_ORDER;
const FPDF_ERR_PASSWORD = 4;
const WHITE = 0xffffffff;
// zlib level, same as libpng default
const PNG_COMPRESSION = 6;
// size of a WASM pointer
const POINTER_BYTES = 4;

let pdfiumPromise: Promise<WrappedPdfiumModule> | undefined;

// WASM build of PDFium (no native binary). Loaded once, on first use.
const getPdfium = (): Promise<WrappedPdfiumModule> => {
  if (!pdfiumPromise) {
    pdfiumPromise = (async () => {
      const { init } = await import('@embedpdf/pdfium');
      const wasmBinary = await readFile(require.resolve('@embedpdf/pdfium/pdfium.wasm'));
      const pdfium = await init({ wasmBinary });
      pdfium.PDFiumExt_Init();
      return pdfium;
    })();
    pdfiumPromise.catch(() => {
      pdfiumPromise = undefined;
    });
  }
  return pdfiumPromise;
};

// HEAPU8 is missing from the pdfium types (they need @types/emscripten, not installed).
// Read it on every call, WASM can replace the heap when memory grows.
const getHeap = (pdfium: WrappedPdfiumModule): Uint8Array => {
  const wasm = pdfium.pdfium;
  if (!('HEAPU8' in wasm) || !(wasm.HEAPU8 instanceof Uint8Array)) {
    throw new Error('PDFium WASM memory is not available');
  }
  return wasm.HEAPU8;
};

// PNG encoder built into @embedpdf/pdfium, see embedpdf/runtime public/fpdf_png.h
const encodePng = (pdfium: WrappedPdfiumModule, bitmap: number, width: number, height: number) => {
  const { malloc, free } = pdfium.pdfium.wasmExports;
  // the encoder writes the address of the PNG it allocates here
  const outPointer = malloc(POINTER_BYTES);
  try {
    const size = pdfium.EPDF_PNG_EncodeRGBA(
      pdfium.FPDFBitmap_GetBuffer(bitmap),
      width,
      height,
      pdfium.FPDFBitmap_GetStride(bitmap),
      PNG_COMPRESSION,
      outPointer
    );
    if (size <= 0) {
      throw new Error('Could not encode the PDF page as PNG');
    }
    const pngPointer = pdfium.pdfium.getValue(outPointer, 'i32');
    try {
      return Buffer.from(getHeap(pdfium).subarray(pngPointer, pngPointer + size));
    } finally {
      free(pngPointer);
    }
  } finally {
    free(outPointer);
  }
};

const renderPage = (pdfium: WrappedPdfiumModule, doc: number, index: number): Buffer => {
  const page = pdfium.FPDF_LoadPage(doc, index);
  if (!page) {
    throw new Error(`Could not open page ${index + 1} of the PDF`);
  }
  try {
    const widthPt = pdfium.FPDF_GetPageWidthF(page);
    const heightPt = pdfium.FPDF_GetPageHeightF(page);
    const scale = Math.min(RENDER_SCALE, MAX_RENDER_SIDE_PX / Math.max(widthPt, heightPt));
    const width = Math.max(1, Math.round(widthPt * scale));
    const height = Math.max(1, Math.round(heightPt * scale));

    const bitmap = pdfium.FPDFBitmap_Create(width, height, 0);
    if (!bitmap) {
      throw new Error(`Could not render page ${index + 1} of the PDF`);
    }
    try {
      pdfium.FPDFBitmap_FillRect(bitmap, 0, 0, width, height, WHITE);
      pdfium.FPDF_RenderPageBitmap(bitmap, page, 0, 0, width, height, 0, RENDER_FLAGS);
      return encodePng(pdfium, bitmap, width, height);
    } finally {
      pdfium.FPDFBitmap_Destroy(bitmap);
    }
  } finally {
    pdfium.FPDF_ClosePage(page);
  }
};

// POC: remove when EIS accepts PDF
/**
 * Renders every page of a PDF to a PNG, returned as base64 strings.
 */
export const pdfToImages = async (buffer: Buffer): Promise<string[]> => {
  const pdfium = await getPdfium();
  const { malloc, free } = pdfium.pdfium.wasmExports;

  // PDFium reads the bytes from WASM memory, they must stay there until the doc is closed
  const dataPointer = malloc(buffer.length);
  if (!dataPointer) {
    throw new Error('Not enough memory to open the PDF');
  }
  try {
    getHeap(pdfium).set(buffer, dataPointer);
    const doc = pdfium.FPDF_LoadMemDocument(dataPointer, buffer.length, '');
    if (!doc) {
      throw new Error(
        pdfium.FPDF_GetLastError() === FPDF_ERR_PASSWORD
          ? 'The PDF is password protected'
          : 'The PDF could not be opened'
      );
    }
    try {
      const pageCount = pdfium.FPDF_GetPageCount(doc);
      if (pageCount === 0) {
        throw new Error('The PDF has no pages');
      }
      if (pageCount > MAX_PDF_PAGES) {
        throw new Error(`PDF has ${pageCount} pages, the limit is ${MAX_PDF_PAGES}`);
      }
      const pages: string[] = [];
      for (let index = 0; index < pageCount; index++) {
        pages.push(renderPage(pdfium, doc, index).toString('base64'));
        // render is sync WASM, let other requests run between pages
        await setImmediate();
      }
      return pages;
    } finally {
      pdfium.FPDF_CloseDocument(doc);
    }
  } finally {
    free(dataPointer);
  }
};
