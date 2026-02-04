/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import type {
  RunContext,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import { smlCrawlerTaskType } from './constants';
import type { SmlService } from './sml_service';

export const registerSmlCrawlerTask = ({
  taskManager,
  logger,
  getSmlService,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  getSmlService: () => SmlService | undefined;
}) => {
  taskManager.registerTaskDefinitions({
    [smlCrawlerTaskType]: {
      title: 'Agent Builder SML crawler',
      timeout: '5m',
      maxAttempts: 3,
      paramsSchema: schema.object({
        attachment_type: schema.string(),
      }),
      stateSchemaByVersion: {
        1: {
          schema: schema.object({}),
          up: (state: Record<string, unknown>) => state,
        },
      },
      createTaskRunner: ({ taskInstance }: RunContext) => ({
        run: async () => {
          const smlService = getSmlService();
          if (!smlService) {
            throw new Error('SML service is not available for crawler task execution.');
          }

          const { attachment_type: attachmentType } = taskInstance.params as {
            attachment_type: string;
          };
          logger.debug(`Running SML crawler task for "${attachmentType}".`);
          await smlService.runCrawlerForType(attachmentType);

          return {
            state: {},
            schedule: taskInstance.schedule,
          };
        },
      }),
    },
  });
};
