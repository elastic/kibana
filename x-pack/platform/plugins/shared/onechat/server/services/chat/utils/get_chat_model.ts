/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { defer, switchMap, map } from 'rxjs';
import type { Span } from '@opentelemetry/api';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { MODEL_TELEMETRY_METADATA } from '../../../telemetry';

export interface ChatModelWithConnectorId {
  chatModel: InferenceChatModel;
  connectorId: string;
}

export const getChatModel$ = ({
  connectorId,
  request,
  inference,
  span,
}: {
  connectorId: string;
  request: KibanaRequest;
  inference: InferenceServerStart;
  span?: Span;
}): Observable<ChatModelWithConnectorId> => {
  return defer(async () => {
    span?.setAttribute('elastic.connector.id', connectorId);
    return inference.getChatModel({
      request,
      connectorId,
      chatModelOptions: {
        telemetryMetadata: MODEL_TELEMETRY_METADATA,
      },
    });
  });
};
