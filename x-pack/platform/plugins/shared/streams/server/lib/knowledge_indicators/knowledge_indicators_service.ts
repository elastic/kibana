/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { searchKnowledgeIndicators } from '@kbn/streams-ai';
import type {
  SearchKnowledgeIndicatorsInput,
  SearchKnowledgeIndicatorsOutput,
} from '@kbn/streams-ai';
import type { StreamsPluginStartDependencies, StreamsServer } from '../../types';
import type { FeatureService } from '../streams/feature/feature_service';
import type { QueryService } from '../streams/assets/query/query_service';
import type { StreamsService } from '../streams/service';
import type { AttachmentService } from '../streams/attachments/attachment_service';
import { assertSignificantEventsAccess } from '../../routes/utils/assert_significant_events_access';
import { getSigEventsTuningConfig } from '../sig_events/helpers/get_sig_events_tuning_config';

export interface KnowledgeIndicatorsClient {
  search(params: SearchKnowledgeIndicatorsInput): Promise<SearchKnowledgeIndicatorsOutput>;
}

export class KnowledgeIndicatorsService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly services: {
      streamsService: StreamsService;
      attachmentService: AttachmentService;
      featureService: FeatureService;
      queryService: QueryService;
    },
    private readonly getServer: () => StreamsServer | undefined,
    private readonly logger: Logger
  ) {}

  async getClient(request: KibanaRequest): Promise<KnowledgeIndicatorsClient> {
    const [coreStart, pluginsStart] = await this.coreSetup.getStartServices();

    const server = this.getServer();
    if (!server) {
      throw new Error('Streams server is not initialized');
    }

    const scopedSoClient = coreStart.savedObjects.getScopedClient(request);
    const uiSettingsClient = coreStart.uiSettings.asScopedToClient(scopedSoClient);
    const globalUiSettingsClient = coreStart.uiSettings.globalAsScopedToClient(scopedSoClient);
    const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);
    const licensing = pluginsStart.licensing;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const license = await licensing.getLicense();
    const isSecurityEnabled = license.getFeature('security').isEnabled;

    const [attachmentClient, tuningConfig] = await Promise.all([
      this.services.attachmentService.getClient({
        soClient: scopedSoClient,
        rulesClient: await pluginsStart.alerting.getRulesClientWithRequest(request),
      }),
      getSigEventsTuningConfig(globalUiSettingsClient, this.logger),
    ]);

    const streamsClient = await this.services.streamsService.getClient({
      attachmentClient,
      esClient: scopedClusterClient.asCurrentUser,
      esClientAsInternalUser: coreStart.elasticsearch.client.asInternalUser,
      uiSettingsClient,
      isSecurityEnabled,
    });

    const { featureService, queryService } = this.services;
    const logger = this.logger;

    return {
      async search(params: SearchKnowledgeIndicatorsInput) {
        const [featureClient, queryClient] = await Promise.all([
          featureService.getClient(tuningConfig),
          (async () => {
            const rulesClient = await pluginsStart.alerting.getRulesClientWithRequestInSpace(
              request,
              DEFAULT_SPACE_ID
            );
            return queryService.getClient({
              esClient: coreStart.elasticsearch.client.asInternalUser,
              soClient: scopedSoClient,
              rulesClient,
              config: tuningConfig,
            });
          })(),
        ]);

        return searchKnowledgeIndicators({
          params,
          onFeatureFetchError: (streamName, error) => {
            const errorMessage =
              error instanceof Error
                ? error.stack ?? error.message
                : String(error ?? 'Unknown error');
            logger.warn(
              `knowledge_indicators_service: failed to fetch features for stream "${streamName}": ${errorMessage}`
            );
          },
          getStreamNames: async () => {
            const streams = await streamsClient.listStreams();
            return streams.map((stream) => stream.name);
          },
          getFeatures: async (streamName, { searchText, limit }) => {
            const result = searchText
              ? await featureClient.findFeatures(streamName, searchText, { limit })
              : await featureClient.getFeatures(streamName, { limit });
            return result.hits;
          },
          getQueries: async (streamNames, searchText) => {
            const filters = { ruleUnbacked: 'include' as const };
            const links = searchText
              ? await queryClient.findQueries(streamNames, searchText, filters)
              : await queryClient.getQueryLinks(streamNames, filters);
            return links;
          },
        });
      },
    };
  }
}
