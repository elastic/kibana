/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { Logger } from '@kbn/logging';

export type StreamParser = (
  responseStream: Readable,
  logger: Logger,
  abortSignal?: AbortSignal,
  tokenHandler?: (token: string) => void
) => Promise<string>;
