/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { MessageRole } from '@kbn/inference-common';

export interface CompleteParams {
  readonly system: string;
  readonly user: string;
  readonly abortSignal?: AbortSignal;
}

/** The part of the inference plugin that the delta summary needs. */
export interface DeltaSummarizer {
  /** True when the user's request can reach a default model. */
  isAvailable: () => Promise<boolean>;
  complete: (params: CompleteParams) => Promise<string>;
}

export const createDeltaSummarizer = ({
  inference,
  request,
  logger,
}: {
  inference: InferenceServerStart;
  request: KibanaRequest;
  logger: Logger;
}): DeltaSummarizer => {
  const getConnectorId = async (): Promise<string | undefined> => {
    try {
      return (await inference.getDefaultConnector(request))?.connectorId;
    } catch (error) {
      logger.debug(`Could not load the default inference connector: ${error}`);
      return undefined;
    }
  };

  return {
    isAvailable: async () => (await getConnectorId()) != null,
    complete: async ({ system, user, abortSignal }) => {
      const connectorId = await getConnectorId();
      if (connectorId == null) {
        throw new Error('No default inference connector is available');
      }

      const { content } = await inference.getClient({ request }).chatComplete({
        connectorId,
        system,
        messages: [{ role: MessageRole.User, content: user }],
        temperature: 0,
        abortSignal,
      });
      return content;
    },
  };
};
