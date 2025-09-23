/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import type { IRouter, CustomRequestHandlerContext, CoreSetup } from '@kbn/core/server';
import type { OnechatPluginStart, OnechatStartDependencies } from './types';

export interface OnechatRequestHandlerContext {
  spaces: {
    getSpaceId: () => Promise<string>;
  };
}

export type OnechatHandlerContext = CustomRequestHandlerContext<{
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

      const getSpaceId = async (): Promise<string> =>
        spaces?.spacesService?.getSpaceId(request) || DEFAULT_SPACE_ID;

      return {
        spaces: {
          getSpaceId,
        },
      };
    }
  );
};
