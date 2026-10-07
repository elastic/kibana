/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import pMap from 'p-map';
import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { pdfToImages } from './pdf_to_images';

// POC: hardcoded endpoint, no config / availability check
const JINA_OCR_INFERENCE_ID = '.jina-ocr-v1-chat_completion';
const OCR_CONCURRENCY = 4;
// POC: whole PDF. Below the 120 s default socket timeout of the attachments route.
const OCR_TOTAL_TIMEOUT_SECONDS = 100;
// POC: one page can take as long as the whole PDF (cold EIS took > 60 s for 1 page).
// Used by ES and by the ES client.
const OCR_PAGE_TIMEOUT_SECONDS = OCR_TOTAL_TIMEOUT_SECONDS;
const OCR_TOO_SLOW_MESSAGE = 'Reading the PDF took too long. Try a smaller PDF.';

const readStreamText = async (stream: Readable): Promise<string> => {
  let raw = '';
  for await (const chunk of stream) {
    raw += chunk.toString();
  }
  // POC: assumes every `data:` line is a complete JSON chunk (no cross-chunk line splitting)
  return raw
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trim())
    .filter((data) => data && data !== '[DONE]')
    .map((data) => {
      const parsed = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string | null } }>;
      };
      return parsed.choices?.[0]?.delta?.content ?? '';
    })
    .join('');
};

const ocrPage = async (
  esClient: ElasticsearchClient,
  pngBase64: string,
  signal: AbortSignal
): Promise<string> => {
  // pages still waiting in the queue don't start after the time limit
  signal.throwIfAborted();
  const stream = await esClient.inference.chatCompletionUnified(
    {
      inference_id: JINA_OCR_INFERENCE_ID,
      timeout: `${OCR_PAGE_TIMEOUT_SECONDS}s`,
      chat_completion_request: {
        messages: [
          {
            role: 'user',
            // POC: no text part on purpose, the model ignores prompts (see jina_ocr_prompt_tests.md)
            content: [
              { type: 'image_url', image_url: { url: `data:image/png;base64,${pngBase64}` } },
            ],
          },
        ],
      },
    } as Parameters<typeof esClient.inference.chatCompletionUnified>[0],
    {
      asStream: true,
      requestTimeout: OCR_PAGE_TIMEOUT_SECONDS * 1000,
      signal,
      // asStream skips decompression, so ask for plain bytes
      headers: { 'accept-encoding': 'identity' },
    }
  );
  return readStreamText(stream as unknown as Readable);
};

/**
 * Turns a PDF into text: one image per page, OCR per page, joined with page markers.
 */
export const extractPdfText = async ({
  esClient,
  buffer,
}: {
  esClient: ElasticsearchClient;
  buffer: Buffer;
}): Promise<string> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OCR_TOTAL_TIMEOUT_SECONDS * 1000);
  let texts: string[];
  try {
    const pages = await pdfToImages(buffer);
    texts = await pMap(pages, (page) => ocrPage(esClient, page, controller.signal), {
      concurrency: OCR_CONCURRENCY,
    });
  } catch (error) {
    if (controller.signal.aborted || error instanceof errors.TimeoutError) {
      throw new Error(OCR_TOO_SLOW_MESSAGE);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
  return texts.map((text, index) => `--- page ${index + 1} ---\n${text.trim()}`).join('\n\n');
};
