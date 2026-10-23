/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The PDF thread: takumi-pdf renders in wasm on the calling thread (elastic/isomer#268), so it runs here, off
// Kibana's event loop, one document at a time.

import { readFileSync } from 'node:fs';
import { parentPort, workerData } from 'node:worker_threads';

import {
  createTakumiImageBackend,
  type PdfInput,
  type TakumiPdfOptions,
} from '@elastic/isomer-image-takumi';

export interface PdfWorkerData {
  /** Font files, registered in order. */
  fonts: readonly string[];
}

export interface PdfMessage {
  id: number;
  input: PdfInput;
  options: TakumiPdfOptions;
}

export type PdfReply = { id: number; pdf: Uint8Array } | { id: number; error: string };

// A small PDF sits in Node's shared Buffer pool, which cannot be transferred, so it is copied instead.
const transferable = (reply: PdfReply): ArrayBuffer[] =>
  'pdf' in reply && reply.pdf.byteLength === reply.pdf.buffer.byteLength
    ? [reply.pdf.buffer as ArrayBuffer]
    : [];

const { fonts } = workerData as PdfWorkerData;
const backend = createTakumiImageBackend({ fonts: fonts.map((path) => readFileSync(path)) });

parentPort?.on('message', ({ id, input, options }: PdfMessage) => {
  void backend
    .pdf(input, options)
    .then(
      (pdf): PdfReply => ({ id, pdf }),
      (error: unknown): PdfReply => ({
        id,
        error: error instanceof Error ? error.message : String(error),
      })
    )
    .then((reply) => parentPort?.postMessage(reply, transferable(reply)));
});
