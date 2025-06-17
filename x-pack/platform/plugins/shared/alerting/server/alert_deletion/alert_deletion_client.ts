/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SecurityServiceStart,
} from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  ConcreteTaskInstance,
} from '@kbn/task-manager-plugin/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { RulesSettingsAlertDeleteProperties } from '@kbn/alerting-types';
import type { GetAlertIndicesAlias } from '../lib';
import type { RuleTypeRegistry } from '../types';
import { getLastRun, previewTask, runTask, scheduleTask } from './lib';

export const ALERT_DELETION_TASK_TYPE = 'alert-deletion';

export const allowedAppCategories = [
  DEFAULT_APP_CATEGORIES.security.id,
  DEFAULT_APP_CATEGORIES.management.id,
  DEFAULT_APP_CATEGORIES.observability.id,
];
interface ConstructorOpts {
  auditService?: AuditServiceSetup;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  eventLogger: IEventLogger;
  getAlertIndicesAlias: GetAlertIndicesAlias;
  logger: Logger;
  ruleTypeRegistry: RuleTypeRegistry;
  securityService: Promise<SecurityServiceStart>;
  spacesService: Promise<SpacesServiceStart | undefined>;
  taskManagerSetup: TaskManagerSetupContract;
  taskManagerStartPromise: Promise<TaskManagerStartContract>;
}

export interface AlertDeletionContext {
  auditService?: AuditServiceSetup;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  eventLogger: IEventLogger;
  getAlertIndicesAlias: GetAlertIndicesAlias;
  logger: Logger;
  ruleTypeRegistry: RuleTypeRegistry;
  securityService: Promise<SecurityServiceStart>;
  spacesService: Promise<SpacesServiceStart | undefined>;
  taskManagerStartPromise: Promise<TaskManagerStartContract>;
}

export class AlertDeletionClient {
  private context: AlertDeletionContext;

  constructor(opts: ConstructorOpts) {
    this.context = {
      auditService: opts.auditService,
      elasticsearchClientPromise: opts.elasticsearchClientPromise,
      eventLogger: opts.eventLogger,
      getAlertIndicesAlias: opts.getAlertIndicesAlias,
      logger: opts.logger.get(ALERT_DELETION_TASK_TYPE),
      ruleTypeRegistry: opts.ruleTypeRegistry,
      securityService: opts.securityService,
      spacesService: opts.spacesService,
      taskManagerStartPromise: opts.taskManagerStartPromise,
    };

    // Registers the task that handles alert deletion
    opts.taskManagerSetup.registerTaskDefinitions({
      [ALERT_DELETION_TASK_TYPE]: {
        title: 'Alert deletion task',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          const abortController = new AbortController();
          return {
            run: async () => {
              return this.runTask(taskInstance, abortController);
            },

            cancel: async () => {
              abortController.abort('task timed out');
            },
          };
        },
      },
    });
  }

  public async getLastRun(req: KibanaRequest): Promise<string | undefined> {
    return await getLastRun(this.context, req);
  }

  public async scheduleTask(
    request: KibanaRequest,
    settings: RulesSettingsAlertDeleteProperties,
    spaceIds: string[]
  ) {
    return await scheduleTask(this.context, request, settings, spaceIds);
  }

  public async previewTask(
    settings: RulesSettingsAlertDeleteProperties,
    spaceId: string
  ): Promise<number> {
    return await previewTask(this.context, settings, spaceId);
  }

  private runTask = async (
    taskInstance: ConcreteTaskInstance,
    abortController: AbortController
  ) => {
    await runTask(this.context, taskInstance, abortController);
  };
}
