/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer, switchMap, Observable } from 'rxjs';
import { Span } from '@opentelemetry/api';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { getConnectorList, getDefaultConnector } from '../../runner/utils';
import { MODEL_TELEMETRY_METADATA } from '../../../telemetry';

export const getChatModel$ = ({
  connectorId,
  request,
  actions,
  inference,
  span,
}: {
  connectorId?: string;
  request: KibanaRequest;
  actions: ActionsPluginStart;
  inference: InferenceServerStart;
  span?: Span;
}): Observable<InferenceChatModel> => {
  return defer(async () => {
    let selectedConnectorId = connectorId;
    if (!selectedConnectorId) {
      const connectors = await getConnectorList({ actions, request });
      const defaultConnector = getDefaultConnector({ connectors });
      selectedConnectorId = defaultConnector.connectorId;
    }
    span?.setAttribute('elastic.connector.id', selectedConnectorId);
    return selectedConnectorId;
  }).pipe(
    switchMap((selectedConnectorId) => {
      return inference.getChatModel({
        request,
        connectorId: selectedConnectorId,
        chatModelOptions: {
          telemetryMetadata: MODEL_TELEMETRY_METADATA,
        },
      });
    })
  );
};
