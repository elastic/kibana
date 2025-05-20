/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ToolHandlerContext } from '@kbn/onechat-server';
import { createModelProviderFactory } from './model_provider';

export interface ToolHandlerContextFactoryArgs {
  request: KibanaRequest;
  defaultConnectorId?: string;
}

export interface ToolHandlerContextFactoryBuilderArgs {
  elasticsearch: ElasticsearchServiceStart;
  inference: InferenceServerStart;
  actions: ActionsPluginStart;
}

export type ToolHandlerContextFactory = (
  args: ToolHandlerContextFactoryArgs
) => Promise<ToolHandlerContext>;

export const createToolHandlerContextFactory = ({
  inference,
  actions,
  elasticsearch,
}: ToolHandlerContextFactoryBuilderArgs): ToolHandlerContextFactory => {
  const modelProviderFactory = createModelProviderFactory({ actions, inference });

  return async ({ request, defaultConnectorId }): Promise<ToolHandlerContext> => {
    return {
      esClient: elasticsearch.client.asScoped(request),
      modelProvider: modelProviderFactory({ request, defaultConnectorId }),
    };
  };
};
