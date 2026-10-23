/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'node:path';
import { Worker } from 'node:worker_threads';

import type { PdfInput, TakumiPdfOptions } from '@elastic/isomer-image-takumi';

import type { PdfMessage, PdfReply, PdfWorkerData } from './pdf_worker';

const workerEntry = join(
  __dirname,
  __filename.endsWith('.ts') ? 'pdf_worker_src_harness.js' : 'pdf_worker.js'
);

export interface PdfWriter {
  /** Writes `input` as a PDF on the PDF thread, started on the first call. */
  write(input: PdfInput, options?: TakumiPdfOptions): Promise<Buffer>;
  /** Stops the PDF thread, rejecting any PDF still owed; a write after this rejects. */
  close(): Promise<void>;
}

interface Pending {
  resolve: (pdf: Buffer) => void;
  reject: (error: Error) => void;
}

/**
 * Writes PDFs with takumi in a worker thread, since takumi-pdf's wasm render would otherwise hold the event loop
 * for the whole document. The thread starts on the first PDF, and again after it exits.
 */
export const createPdfWriter = ({ fonts }: PdfWorkerData): PdfWriter => {
  let worker: Worker | undefined;
  let closed = false;
  let nextId = 0;
  const pending = new Map<number, Pending>();

  const settle = (id: number) => {
    const entry = pending.get(id);
    pending.delete(id);
    if (pending.size === 0) {
      // The thread keeps the process alive only while a PDF is owed.
      worker?.unref();
    }
    return entry;
  };
  const failAll = (error: Error) => {
    for (const id of [...pending.keys()]) {
      settle(id)?.reject(error);
    }
  };
  const start = () => {
    const started = new Worker(workerEntry, { workerData: { fonts } satisfies PdfWorkerData });
    started.on('message', (reply: PdfReply) => {
      const entry = settle(reply.id);
      if ('pdf' in reply) {
        entry?.resolve(Buffer.from(reply.pdf.buffer, reply.pdf.byteOffset, reply.pdf.byteLength));
      } else {
        entry?.reject(new Error(reply.error));
      }
    });
    started.on('error', failAll);
    started.on('exit', () => {
      if (worker === started) {
        worker = undefined;
      }
      failAll(new Error('the PDF thread exited'));
    });
    return started;
  };

  return {
    write: (input, options = {}) => {
      if (closed) {
        return Promise.reject(new Error('the PDF thread is closed'));
      }
      worker ??= start();
      const thread = worker;
      nextId += 1;
      const id = nextId;
      return new Promise<Buffer>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        thread.ref();
        thread.postMessage({ id, input, options } satisfies PdfMessage);
      });
    },
    close: async () => {
      closed = true;
      const thread = worker;
      worker = undefined;
      await thread?.terminate();
    },
  };
};
