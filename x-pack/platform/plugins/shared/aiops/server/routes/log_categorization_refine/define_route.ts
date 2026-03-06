/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { Logger } from '@kbn/logging';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { AIOPS_API_ENDPOINT } from '@kbn/aiops-common/constants';
import { refinePatternsBodySchema } from './refine_patterns_schema';
import { refinePatternsHandlerFactory } from './refine_patterns_handler';

export const defineRefinePatternsRoute = (
  router: IRouter<DataRequestHandlerContext>,
  inference: InferenceServerStart | undefined,
  logger: Logger
) => {
  if (!inference) {
    return;
  }

  router.post(
    {
      path: AIOPS_API_ENDPOINT.LOG_CATEGORIZATION_REFINE_PATTERNS,
      options: { access: 'internal' },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the inference client and connector access',
        },
      },
      validate: {
        body: refinePatternsBodySchema,
      },
    },
    refinePatternsHandlerFactory(inference, logger)
  );
};
