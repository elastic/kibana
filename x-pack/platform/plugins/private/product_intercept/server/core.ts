/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RequestHandlerContext,
  type CoreSetup,
  type CoreStart,
  type Logger,
  IRouter,
} from '@kbn/core/server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { parseIntervalAsMillisecond } from '@kbn/task-manager-plugin/server/lib/intervals';
import semverLt from 'semver/functions/lt';
import {
  interceptTriggerRecordSavedObject,
  InterceptTriggerRecord,
} from './saved_objects/intercept_trigger';
import { TRIGGER_API_ENDPOINT } from '../common/constants';

interface ProductInterceptTriggerCoreSetup {
  isServerless: boolean;
  isCloudDeployment: boolean;
  kibanaVersion: string;
}

interface ProductInterceptTriggerRouteContext extends RequestHandlerContext {
  triggerInfo: Promise<{
    registeredAt: ReturnType<Date['toISOString']>;
    triggerIntervalInMs: number;
  } | null>;
}

export class ProductInterceptTriggerCore {
  private logger?: Logger;
  private savedObjectsClient?: ISavedObjectsRepository;
  private isServerless?: boolean;
  private isCloudDeployment?: boolean;
  private kibanaVersion?: string;

  // define a known id for the record used for trigger information
  private readonly defId = 'productInterceptTrigger';

  setup(
    core: CoreSetup,
    logger: Logger,
    { isServerless, kibanaVersion, isCloudDeployment }: ProductInterceptTriggerCoreSetup
  ) {
    this.logger = logger;
    this.isServerless = isServerless;
    this.kibanaVersion = kibanaVersion;
    this.isCloudDeployment = isCloudDeployment;

    core.savedObjects.registerType(interceptTriggerRecordSavedObject);

    core.http.registerRouteHandlerContext<ProductInterceptTriggerRouteContext, 'triggerInfo'>(
      'triggerInfo',
      this.routerHandlerContext.bind(this)
    );

    const router = core.http.createRouter<ProductInterceptTriggerRouteContext>();

    router.get.apply(router, this.getRouteConfig());
  }

  async start(core: CoreStart) {
    this.savedObjectsClient = core.savedObjects.createInternalRepository([
      interceptTriggerRecordSavedObject.name,
    ]);

    try {
      await this.registerTriggerDefinition();
    } catch (err) {
      this.logger?.error(err);
    }
  }

  /**
   * @description this method provides trigger information as context for the route handler
   */
  async routerHandlerContext() {
    let triggerInfo: ProductInterceptTriggerRouteContext['triggerInfo'] extends Promise<infer T>
      ? T
      : never = null;

    let registeredTriggerDefinition;

    if ((registeredTriggerDefinition = await this.fetchRegisteredTask())) {
      triggerInfo = {
        registeredAt: registeredTriggerDefinition.firstRegisteredAt,
        triggerIntervalInMs: parseIntervalAsMillisecond(
          registeredTriggerDefinition.triggerInterval
        ),
      };
    }

    return triggerInfo;
  }

  getRouteConfig(): Parameters<IRouter<ProductInterceptTriggerRouteContext>['get']> {
    return [
      {
        path: TRIGGER_API_ENDPOINT,
        validate: false,
        security: {
          authz: {
            enabled: false,
            reason:
              'route is public and provides information about the next product intercept trigger',
          },
        },
      },
      async (context, request, response) => {
        const resolvedTriggerInfo = await context.triggerInfo;

        if (!resolvedTriggerInfo) {
          return response.ok({
            body: {},
          });
        }

        // if (request.headers['if-none-match']) {
        //   return response.notModified({});
        // }

        return response.ok({
          headers: {
            // etag: String(resolvedTriggerInfo.runs),
            // age: String(responseExpirationValueInMs),
            // 'cache-control': `private, max-age=${configuredIntervalInMs}, immutable`,
          },
          body: resolvedTriggerInfo,
        });
      },
    ];
  }

  async registerTriggerDefinition() {
    const existingTriggerDef = await this.fetchRegisteredTask();

    if (
      existingTriggerDef &&
      this.isCloudDeployment &&
      semverLt(existingTriggerDef.installedOn, this.kibanaVersion!)
    ) {
      // This will contain logic for cloud environments that get it's version bumped
    }

    if (!existingTriggerDef) {
      await this.savedObjectsClient?.create<InterceptTriggerRecord>(
        interceptTriggerRecordSavedObject.name,
        {
          firstRegisteredAt: new Date().toISOString(),
          triggerInterval: this.isServerless ? '30d' : '30s',
          installedOn: this.kibanaVersion!,
        },
        { id: this.defId }
      );
    }
  }

  async fetchRegisteredTask() {
    let result;

    try {
      result = await this.savedObjectsClient?.get<InterceptTriggerRecord>(
        interceptTriggerRecordSavedObject.name,
        this.defId
      );
    } catch (err) {
      this.logger?.error(err);
    }

    return result?.attributes ?? null;
  }
}
