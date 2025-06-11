/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  CoreSetup,
  CoreStart,
  ElasticsearchClient,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { z } from '@kbn/zod';
import type { OnechatConfig } from './config';
import type {
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies,
} from './types';
import { registerRoutes } from './routes';
import { ServiceManager } from './services';
import { registerFeatures } from './features';
import { ONECHAT_MCP_SERVER_UI_SETTING_ID } from '../common/constants';

export interface SearchDslResult {
  id: string;
  index: string;
  source: unknown;
}

export interface SearchDslResponse {
  results: SearchDslResult[];
}

export class OnechatPlugin
  implements
    Plugin<
      OnechatPluginSetup,
      OnechatPluginStart,
      OnechatSetupDependencies,
      OnechatStartDependencies
    >
{
  private logger: Logger;
  // @ts-expect-error unused for now
  private config: OnechatConfig;
  private serviceManager = new ServiceManager();

  constructor(context: PluginInitializerContext<OnechatConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<OnechatStartDependencies, OnechatPluginStart>,
    pluginsSetup: OnechatSetupDependencies
  ): OnechatPluginSetup {
    const serviceSetups = this.serviceManager.setupServices({
      logger: this.logger.get('services'),
    });

    // for demo!!!! TODO: remove this
    serviceSetups.tools.register({
      id: 'list_indices',
      description: 'List the indices in the Elasticsearch cluster the current user has access to.',
      schema: z.object({
        pattern: z
          .string()
          .describe('optional pattern to filter indices by. Defaults to *')
          .optional(),
      }),
      handler: async ({ pattern }, { esClient }) => {
        const indicesResponse = await esClient.asCurrentUser.cat.indices({
          index: pattern,
          format: 'json',
        });

        return indicesResponse.map((index) => ({
          index: index.index,
          health: index.health,
          status: index.status,
          docsCount: index.docsCount,
        }));
      },
    });

    // for demo!!!! TODO: remove this
    serviceSetups.tools.register({
      id: 'get_index_mapping',
      description: 'Retrieve mappings for the specified index or indices.',
      schema: z.object({
        indices: z.array(z.string()).min(1).describe('List of indices to retrieve mappings for.'),
      }),
      handler: async ({ indices }, { esClient }) => {
        const response = await esClient.asCurrentUser.indices.getMapping({
          index: indices,
        });
        return response;
      },
    });

    // for demo!!!! TODO: remove this
    serviceSetups.tools.register({
      id: 'search_dsl',
      description: 'Run a DSL search query on one index and return matching documents.',
      schema: z.object({
        queryBody: z
          .record(z.any())
          .refine(
            (val) => {
              try {
                JSON.parse(JSON.stringify(val));
                return true;
              } catch (e) {
                return false;
              }
            },
            {
              message: 'queryBody must be a valid Elasticsearch query DSL object',
            }
          )
          .describe(
            'Complete Elasticsearch query DSL object that can include query, size, from, sort, etc.'
          ),
        index: z.string().describe('Index to search against'),
      }),

      handler: async ({ queryBody, index }, { esClient }) => {
        const parsedQuery = typeof queryBody === 'string' ? JSON.parse(queryBody) : queryBody ?? {};
        const searchDsl = async ({
          queryBody,
          index,
          esClient,
        }: {
          queryBody: SearchRequest;
          index: string;
          esClient: ElasticsearchClient;
        }): Promise<SearchDslResponse> => {
          const response = await esClient.search<any>({
            index,
            ...queryBody,
          });

          const results = response.hits.hits.map<SearchDslResult>((hit) => {
            return {
              id: hit._id!,
              index: hit._index!,
              source: hit._source ?? {},
            };
          });

          return { results };
        };
        return searchDsl({ queryBody: parsedQuery, index, esClient: esClient.asCurrentUser });
      },
    });

    registerFeatures({ features: pluginsSetup.features });

    coreSetup.uiSettings.register({
      [ONECHAT_MCP_SERVER_UI_SETTING_ID]: {
        description: i18n.translate('onechat.uiSettings.mcpServer.description', {
          defaultMessage: 'Enables MCP server with access to tools.',
        }),
        name: i18n.translate('onechat.uiSettings.mcpServer.name', {
          defaultMessage: 'MCP Server',
        }),
        schema: schema.boolean(),
        value: false,
        readonly: true,
        readonlyMode: 'ui',
      },
    });

    const router = coreSetup.http.createRouter();
    registerRoutes({
      router,
      coreSetup,
      logger: this.logger,
      getInternalServices: () => {
        const services = this.serviceManager.internalStart;
        if (!services) {
          throw new Error('getInternalServices called before service init');
        }
        return services;
      },
    });

    return {
      tools: {
        register: serviceSetups.tools.register.bind(serviceSetups.tools),
        registerProvider: serviceSetups.tools.registerProvider.bind(serviceSetups.tools),
      },
    };
  }

  start(
    { elasticsearch, security }: CoreStart,
    { actions, inference }: OnechatStartDependencies
  ): OnechatPluginStart {
    const startServices = this.serviceManager.startServices({
      logger: this.logger.get('services'),
      security,
      elasticsearch,
      actions,
      inference,
    });

    const { tools, agents, runnerFactory } = startServices;
    const runner = runnerFactory.getRunner();

    return {
      tools: {
        registry: tools.registry.asPublicRegistry(),
        execute: runner.runTool.bind(runner),
        asScoped: ({ request }) => {
          return {
            registry: tools.registry.asScopedPublicRegistry({ request }),
            execute: (args) => {
              return runner.runTool({ ...args, request });
            },
          };
        },
      },
      agents: {
        registry: agents.registry.asPublicRegistry(),
        execute: async (args) => {
          return agents.execute(args);
        },
      },
    };
  }

  stop() {}
}
