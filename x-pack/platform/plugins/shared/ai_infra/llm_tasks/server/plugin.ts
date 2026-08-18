/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';


// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class LlmTasksPlugin extends Service {
  static readonly inject: string[] = [];
  static readonly provide = 'llmTasks';

  constructor(ctx: Context) {
    super(ctx, 'llmTasks');

    // TODO: start() had a non-empty body — migrate manually:
    // {
    //     const { inference, productDocBase } = startDependencies;
    //     return {
    //       retrieveDocumentationAvailable: async (options: {
    //         inferenceId: string;
    //         resourceType?: ResourceType;
    //       }) => {
    //         try {
    //           const resourceType = options.resourceType ?? ResourceTypes.productDoc;
    //           if (resourceType === ResourceTypes.securityLabs) {
    //             const status = await startDependencies.productDocBase.management.getSecurityLabsStatus({
    //               inferenceId: options.inferenceId,
    //             });
    //             return status.status === 'installed';
    //           }
    //           const docBaseStatus = await startDependencies.productDocBase.management.getStatus({
    //             inferenceId: options.inferenceId,
    //           });
    //           return docBaseStatus.status === 'installed';
    //         } catch {
    //           return false;
    //         }
    //       },
    //       retrieveDocumentation: (options) => {
    //         return retrieveDocumentation({
    //           outputAPI: inference.getClient({ request: options.request }).output,
    //           searchDocAPI: productDocBase.search,
    //           logger: this.logger.get('tasks.retrieve-documentation'),
    //         })(options);
    //       },
    //     };
    //   }
  }
}
