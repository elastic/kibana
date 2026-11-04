/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { CONNECTOR_BUILDER_INFERENCE_FEATURE_ID } from '../../../common/connector_type_generation';
import { fetchDocumentation } from './fetch_documentation';
import { generateConnectorTypeSpec } from './generate_connector_type_spec';
import { GenerateConnectorTypeError } from './types';

/** Generates a validated draft from one documentation page. The caller must check superuser access. */
export const generateFromDocumentation = async ({
  url,
  request,
  getInference,
  getActionsConfigurationUtilities,
  logger,
  abortSignal,
}: {
  url: string;
  request: KibanaRequest;
  getInference: () => Promise<InferenceServerStart | undefined>;
  getActionsConfigurationUtilities: () => ActionsConfigurationUtilities;
  logger: Logger;
  abortSignal?: AbortSignal;
}): Promise<CreateConnectorTypeRequest> => {
  const inference = await getInference();
  if (!inference) {
    throw new GenerateConnectorTypeError(
      'no_model',
      'No AI model is available. Set a default AI connector or pick a model for Connector type builder in Feature Settings.',
      400
    );
  }

  const document = await fetchDocumentation({
    url,
    configurationUtilities: getActionsConfigurationUtilities(),
    logger,
  });
  return generateConnectorTypeSpec({
    inferenceClient: inference.getClient({ request }),
    featureId: CONNECTOR_BUILDER_INFERENCE_FEATURE_ID,
    document,
    logger,
    abortSignal,
  });
};
