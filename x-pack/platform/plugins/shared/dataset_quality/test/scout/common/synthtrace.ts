/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogDocument, SynthtraceGenerator } from '@kbn/synthtrace-client';
import type { SynthtraceFixture } from '@kbn/scout-synthtrace';

/**
 * Indexes several synthtrace generators. `logsSynthtraceEsClient.index()` takes a single
 * generator — it calls `Array.from(events)`, so passing an array yields generator objects
 * instead of documents and fails with `chunk.serialize is not a function`.
 */
export const indexLogs = async (
  client: SynthtraceFixture['logsSynthtraceEsClient'],
  generators: Array<SynthtraceGenerator<LogDocument>>
): Promise<void> => {
  for (const generator of generators) {
    await client.index(generator);
  }
};
