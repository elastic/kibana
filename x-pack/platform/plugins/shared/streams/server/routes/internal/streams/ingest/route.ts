/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { ProcessorSuggestionsResponse } from '../../../../../common';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';

const processorSuggestionsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/ingest/processor_suggestions',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({ processorSuggestions }): Promise<ProcessorSuggestionsResponse> => {
    return processorSuggestions.getAllSuggestions();
  },
});

export const internalIngestRoutes = {
  ...processorSuggestionsRoute,
};
