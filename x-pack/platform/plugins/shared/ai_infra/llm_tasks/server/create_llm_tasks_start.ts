/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ProductDocBaseStartContract } from '@kbn/product-doc-base-plugin/server';
import { ResourceTypes, type ResourceType } from '@kbn/product-doc-common';
import type { LlmTasksPluginStart } from './types';
import { retrieveDocumentation } from './task_impls/retrieve_documentation/retrieve_documentation';

/**
 * The llmTasks start contract over the contracts of the plugins it depends on, so that Kibana and
 * the task pod (which passes the tasks contracts of those plugins) share one implementation.
 */
export const createLlmTasksStart = ({
  inference,
  productDocBase,
  logger,
}: {
  inference: Pick<InferenceServerStart, 'getClient'>;
  productDocBase: {
    search: ProductDocBaseStartContract['search'];
    management: Pick<
      ProductDocBaseStartContract['management'],
      'getStatus' | 'getSecurityLabsStatus'
    >;
  };
  logger: Logger;
}): LlmTasksPluginStart => ({
  retrieveDocumentationAvailable: async (options: {
    inferenceId: string;
    resourceType?: ResourceType;
  }) => {
    try {
      const resourceType = options.resourceType ?? ResourceTypes.productDoc;
      if (resourceType === ResourceTypes.securityLabs) {
        const status = await productDocBase.management.getSecurityLabsStatus({
          inferenceId: options.inferenceId,
        });
        return status.status === 'installed';
      }
      const docBaseStatus = await productDocBase.management.getStatus({
        inferenceId: options.inferenceId,
      });
      return docBaseStatus.status === 'installed';
    } catch {
      return false;
    }
  },
  retrieveDocumentation: (options) => {
    return retrieveDocumentation({
      outputAPI: inference.getClient({ request: options.request }).output,
      searchDocAPI: productDocBase.search,
      logger: logger.get('tasks.retrieve-documentation'),
    })(options);
  },
});
