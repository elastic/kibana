/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
<<<<<<< HEAD:x-pack/platform/plugins/shared/inference/server/util/load_default_connector.ts
import { InferenceConnector } from '@kbn/inference-common';
import { getDefaultConnector } from '../../common/utils/get_default_connector';
import { getConnectorList } from './get_connector_list';
=======
import type { InferenceConnector } from '@kbn/inference-common';
import { isSupportedConnector, connectorToInference } from '@kbn/inference-common';
>>>>>>> origin/main:x-pack/solutions/chat/packages/wc-genai-utils/src/connectors/get_connector_list.ts

export const loadDefaultConnector = async ({
  actions,
  request,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
}): Promise<InferenceConnector> => {
  const connectors = await getConnectorList({ actions, request });
  return getDefaultConnector({ connectors });
};
