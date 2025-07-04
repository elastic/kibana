/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import {
  RequestHandlerContext,
  type CoreSetup,
  type CoreStart,
  type Logger,
  type IRouter,
  type IContextProvider,
} from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { parseIntervalAsMillisecond } from '@kbn/task-manager-plugin/server/lib/intervals';
import { InterceptTriggerService } from './services/intercept_trigger';
import { InterceptUserInteractionService } from './services/intercept_user_interaction';
import { TRIGGER_INFO_API_ROUTE } from '../common/constants';
import type { TriggerInfo } from '../common/types';

interface InterceptTriggerRouteContext extends RequestHandlerContext {
  triggerInfo: Promise<TriggerInfo>;
}

interface InterceptTriggerCoreSetup {
  kibanaVersion: string;
}

export class InterceptsTriggerOrchestrator {
  private logger?: Logger;
  private interceptTriggerService = new InterceptTriggerService();
  private interceptUserInteractionService = new InterceptUserInteractionService();

  setup(core: CoreSetup, logger: Logger, { kibanaVersion }: InterceptTriggerCoreSetup) {
    this.logger = logger;

    const { fetchRegisteredTask } = this.interceptTriggerService.setup(core, this.logger, {
      kibanaVersion,
    });

    this.interceptUserInteractionService.setup(core, this.logger);

    core.http.registerRouteHandlerContext<InterceptTriggerRouteContext, 'triggerInfo'>(
      'triggerInfo',
      this.routerHandlerContext.bind(this, fetchRegisteredTask)
    );

    const router = core.http.createRouter<InterceptTriggerRouteContext>();

    router.post.apply(router, this.getRouteConfig());
  }

  start(core: CoreStart) {
    const { registerTriggerDefinition } = this.interceptTriggerService.start(core);

    this.interceptUserInteractionService.start(core);

    return {
      registerTriggerDefinition,
    };
  }

  /**
   * @description this method provides trigger information as context for the route handler
   */
  private async routerHandlerContext(
    fetchRegisteredTask: ReturnType<InterceptTriggerService['setup']>['fetchRegisteredTask'],
    ...args: Parameters<IContextProvider<InterceptTriggerRouteContext, 'triggerInfo'>>
  ) {
    const [, request] = args;

    // @ts-expect-error -- the context is not typed
    const triggerId = request.body?.triggerId;

    if (!triggerId) {
      return null;
    }

    let triggerInfo: InterceptTriggerRouteContext['triggerInfo'] extends Promise<infer T>
      ? T
      : never = null;

    let registeredTriggerDefinition;

    if ((registeredTriggerDefinition = await fetchRegisteredTask(triggerId))) {
      triggerInfo = {
        registeredAt: registeredTriggerDefinition.firstRegisteredAt,
        triggerIntervalInMs: parseIntervalAsMillisecond(registeredTriggerDefinition.triggerAfter),
        recurrent: registeredTriggerDefinition.recurrent,
      };
    }

    return triggerInfo;
  }

  private getRouteConfig(): Parameters<IRouter<InterceptTriggerRouteContext>['post']> {
    return [
      {
        path: TRIGGER_INFO_API_ROUTE,
        validate: {
          body: schema.object({
            triggerId: schema.string(),
          }),
        },
        security: {
          authz: {
            enabled: false,
            reason: 'route is public and provides information about the intercept trigger',
          },
        },
      },
      async (context, request, response) => {
        const resolvedTriggerInfo = await context.triggerInfo;

        if (!resolvedTriggerInfo) {
          return response.noContent();
        }

        // use the trigger interval as the etag
        const responseETag = crypto
          .createHash('sha256')
          .update(Buffer.from(String(resolvedTriggerInfo.triggerIntervalInMs)))
          .digest('hex');

        if (request.headers['if-none-match'] === responseETag) {
          return response.notModified({});
        }

        return response.ok({
          headers: {
            etag: responseETag,
            // cache the response for the duration of the trigger interval
            'cache-control': `max-age=${resolvedTriggerInfo.triggerIntervalInMs}, must-revalidate`,
          },
          body: resolvedTriggerInfo,
        });
      },
    ];
  }
}
