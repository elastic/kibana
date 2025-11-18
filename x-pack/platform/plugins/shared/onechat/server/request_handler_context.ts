/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, CustomRequestHandlerContext, CoreSetup } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import { getCurrentSpaceId } from './utils/spaces';
import type { OnechatPluginStart, OnechatStartDependencies } from './types';

export interface OnechatRequestHandlerContext {
  spaces: {
    getSpaceId: () => string;
  };
}

export type OnechatHandlerContext = CustomRequestHandlerContext<{
  licensing: LicensingApiRequestHandlerContext;
  onechat: OnechatRequestHandlerContext;
}>;

export type OnechatRouter = IRouter<OnechatHandlerContext>;

export const registerOnechatHandlerContext = ({
  coreSetup,
}: {
  coreSetup: CoreSetup<OnechatStartDependencies, OnechatPluginStart>;
}) => {
  coreSetup.http.registerRouteHandlerContext<OnechatHandlerContext, 'onechat'>(
    'onechat',
    async (context, request) => {
      const [, { spaces }] = await coreSetup.getStartServices();

      return {
        spaces: {
          getSpaceId: () => getCurrentSpaceId({ request, spaces }),
        },
      };
    }
  );
};
