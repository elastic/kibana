/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { createOutputApi } from '../common/output';
import type {
  GetConnectorsResponseBody,
  GetAnonymizationEnabledResponseBody,
} from '../common/http_apis';
import type {
  ConfigSchema,
  InferencePublicSetup,
  InferencePublicStart,
  InferenceSetupDependencies,
  InferenceStartDependencies,
} from './types';
import { createChatCompleteRestApi } from '../common/rest/chat_complete';

export class InferencePlugin
  implements
  Plugin<
    InferencePublicSetup,
    InferencePublicStart,
    InferenceSetupDependencies,
    InferenceStartDependencies
  > {
  logger: Logger;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<InferenceStartDependencies, InferencePublicStart>,
    pluginsSetup: InferenceSetupDependencies
  ): InferencePublicSetup {
    return {};
  }

  start(coreStart: CoreStart, pluginsStart: InferenceStartDependencies): InferencePublicStart {
    const chatComplete = createChatCompleteRestApi({ fetch: coreStart.http.fetch });
    const output = createOutputApi(chatComplete);

    return {
      chatComplete,
      output,
      getConnectors: async () => {
        const { connectors } = await coreStart.http.get<GetConnectorsResponseBody>(
          '/internal/inference/connectors'
        );
        return connectors;
      },
      isAnonymizationEnabled: async () => {
        try {
          const { anonymizationEnabled } =
            await coreStart.http.get<GetAnonymizationEnabledResponseBody>(
              '/internal/inference/anonymization_enabled'
            );
          return anonymizationEnabled;
        } catch {
          return false;
        }
      },
    };
  }
}
