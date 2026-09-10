/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createTracedEsClient } from '@kbn/traced-es-client';

export const createSignificantEventsTracedEsClient = ({
  client,
  logger,
  abortSignal,
}: {
  client: ElasticsearchClient;
  logger: Logger;
  abortSignal?: AbortSignal;
}) => createTracedEsClient({ client, logger, plugin: 'significantEvents', abortSignal });
