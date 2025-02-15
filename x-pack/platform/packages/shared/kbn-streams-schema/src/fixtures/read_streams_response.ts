/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ingestReadStream } from './ingest_read_stream';
import { wiredReadStream } from './wired_read_stream';

export const readStreamResponse = {
  streams: [wiredReadStream, ingestReadStream],
};
