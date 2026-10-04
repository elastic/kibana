/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import pMap from 'p-map';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { pdfToImages } from './pdf_to_images';

// POC: hardcoded endpoint, no config / availability check
const JINA_OCR_INFERENCE_ID = '.jina-ocr-v1-chat_completion';
const OCR_CONCURRENCY = 4;
const OCR_TIMEOUT_MS = 120_000;

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

const ocrPage = async (esClient: ElasticsearchClient, pngBase64: string): Promise<string> => {
  const stream = await esClient.inference.chatCompletionUnified(
    {
      inference_id: JINA_OCR_INFERENCE_ID,
      timeout: '2m',
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
      requestTimeout: OCR_TIMEOUT_MS,
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
  const pages = await pdfToImages(buffer);
  const texts = await pMap(pages, (page) => ocrPage(esClient, page), {
    concurrency: OCR_CONCURRENCY,
  });
  return texts.map((text, index) => `--- page ${index + 1} ---\n${text.trim()}`).join('\n\n');
};
