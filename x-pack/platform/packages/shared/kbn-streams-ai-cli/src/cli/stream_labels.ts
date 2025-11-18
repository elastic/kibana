/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';

export function formatStreamLabel(stream: Streams.ingest.all.Definition): string {
  if (stream.description) {
    return `${stream.name} — ${stream.description}`;
  }

  return stream.name;
}
