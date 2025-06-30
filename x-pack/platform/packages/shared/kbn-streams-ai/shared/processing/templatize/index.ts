/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Piscina from 'piscina';
import path from 'path';
import type { ExtractTemplateResult } from './types';

const worker = new Piscina({
  filename: path.resolve(__dirname, './worker.js'),
  maxThreads: 4,
  minThreads: 1,
  closeTimeout: 250,
  trackUnmanagedFds: true,
  // Terminate workers if they exceed resource limits
  resourceLimits: {
    maxOldGenerationSizeMb: 512,
    maxYoungGenerationSizeMb: 128,
  },
});

/**
 * Runs extractTemplate in a worker thread to avoid blocking the main thread
 * @param messages Array of log messages to extract a template from
 * @returns Promise resolving to the extraction result
 */
export async function extractTemplate(
  messages: string[],
  timeout: number = 5000
): Promise<ExtractTemplateResult> {
  const controller = new AbortController();

  // Use the timeout parameter consistently
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    return await worker.run(messages, {
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      // Force terminate any stuck workers
      if (worker.threads.length > 0) {
        // Attempt to terminate stuck threads
        await Promise.all(
          worker.threads.map(async (thread) => {
            try {
              await thread.terminate();
            } catch (e) {
              // Ignore termination errors
            }
          })
        );
      }
      throw new Error('Template extraction timed out - worker terminated');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
