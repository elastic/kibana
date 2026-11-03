/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  CoreTasksStart,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { getSecurityLabsIndexName } from '@kbn/product-doc-common';
import type { TaskManagerTasksStart } from '@kbn/task-manager-plugin/server/tasks';
import { productDocInstallStatusSavedObjectTypeName } from '../../common/consts';
import { productDocInstallStatusSavedObjectType } from '../saved_objects';
import { ProductDocInstallClient } from '../services/doc_install_status';
import { getDocumentationStatus } from '../services/doc_manager/get_status';
import type {
  DocumentationManagerAPI,
  SecurityLabsStatusResponse,
} from '../services/doc_manager/types';
import { SearchService } from '../services/search';
import type { SearchApi } from '../services/search';
import { productDocBaseBridge } from './bridge';

interface TasksStartDeps {
  taskManager: TaskManagerTasksStart;
}

/**
 * What a task needs of the product documentation: searching it and reading what is installed.
 * Installing, updating and uninstalling it stay in Kibana, so they are not part of this contract.
 */
export interface ProductDocBaseTasksStart {
  search: SearchApi;
  management: Pick<DocumentationManagerAPI, 'getStatus' | 'getSecurityLabsStatus'>;
}

/**
 * The product documentation for task runtimes. In Kibana it is the plugin's own (the bridge). A task
 * pod reads the install status and searches the documentation indices with the internal user, and
 * never installs: Kibana does. The status of the Security Labs content is the one the install
 * recorded, or the content of its index, without checking the artifact repository for a newer
 * version (a pod has no use for the update information).
 */
class ProductDocBaseTasksPlugin
  implements TasksPlugin<void, ProductDocBaseTasksStart, object, TasksStartDeps>
{
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(core: CoreTasksSetup) {
    // In Kibana the plugin's `server` entry has registered the type already.
    if (productDocBaseBridge.getSetup()) return;
    core.savedObjects.registerType(productDocInstallStatusSavedObjectType);
  }

  start(core: CoreTasksStart, { taskManager }: TasksStartDeps): ProductDocBaseTasksStart {
    const real = productDocBaseBridge.getStart();
    if (real) return real;

    const esClient = core.elasticsearch.client.asInternalUser;
    const installClient = new ProductDocInstallClient({
      soClient: core.savedObjects.getUnsafeInternalClient({
        includedHiddenTypes: [productDocInstallStatusSavedObjectTypeName],
      }) as never,
      log: this.logger,
    });
    const searchService = new SearchService({
      esClient,
      logger: this.logger.get('search-service'),
    });

    const getSecurityLabsStatus = async ({
      inferenceId,
    }: {
      inferenceId: string;
    }): Promise<SecurityLabsStatusResponse> => {
      try {
        const status = await installClient.getSecurityLabsInstallationStatus({ inferenceId });
        if (status.status !== 'uninstalled' || status.version || status.failureReason) {
          return status;
        }
        // Content installed before the install status was recorded
        const index = getSecurityLabsIndexName(inferenceId);
        if (!(await esClient.indices.exists({ index }))) return { status: 'uninstalled' };
        const { count } = await esClient.count({ index });
        return count === 0 ? { status: 'uninstalled' } : { status: 'installed' };
      } catch (error) {
        this.logger.error(`Failed to get Security Labs status: ${error.message}`);
        return { status: 'error', failureReason: error.message };
      }
    };

    return {
      search: searchService.search.bind(searchService),
      management: {
        getStatus: ({ inferenceId }) =>
          getDocumentationStatus({ taskManager, docInstallClient: installClient, inferenceId }),
        getSecurityLabsStatus,
      },
    };
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new ProductDocBaseTasksPlugin(context);
