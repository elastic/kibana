/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isInferenceRequestError } from '@kbn/inference-common';
// Leaf imports: the package root pulls in streamlang, which a task pod must not load.
import {
  NIGHTSHIFT_DEFAULT_MODELS,
  type NightshiftModelStep,
} from '@kbn/significant-events-schema/src/nightshift_models';
import { NightshiftModelBlockedError } from '@kbn/significant-events-schema/src/nightshift_model_blocked_error';
import { NightshiftModelNotFoundError } from '@kbn/significant-events-schema/src/nightshift_model_not_found_error';

export interface NightshiftModelRestriction {
  defaultOnly: boolean;
  defaultConnectorId?: string;
}

export interface ResolveNightshiftModelOptions {
  step: NightshiftModelStep;
  requestedId?: string;
  roundConnectorId?: string;
  validateConnector: (connectorId: string) => Promise<{ connectorId: string }>;
  getModelRestriction: () => Promise<NightshiftModelRestriction>;
  onFallback?: (reason: NightshiftModelNotFoundError) => void;
}

type ConnectorValidationResult = { connectorId: string } | { notFound: true };

const validateCandidate = async (
  connectorId: string,
  validateConnector: ResolveNightshiftModelOptions['validateConnector']
): Promise<ConnectorValidationResult> => {
  try {
    return await validateConnector(connectorId);
  } catch (error) {
    if (isInferenceRequestError(error) && error.status === 404) {
      return { notFound: true };
    }
    throw error;
  }
};

export const resolveNightshiftModel = async ({
  step,
  requestedId,
  roundConnectorId,
  validateConnector,
  getModelRestriction,
  onFallback,
}: ResolveNightshiftModelOptions): Promise<string> => {
  const requestedModelId = requestedId?.trim();
  const roundModelId = roundConnectorId?.trim();
  let selectedConnectorId: string | undefined;

  if (requestedModelId) {
    const result = await validateCandidate(requestedModelId, validateConnector);
    if ('notFound' in result) {
      throw new NightshiftModelNotFoundError(requestedModelId);
    }
    selectedConnectorId = result.connectorId;
  } else if (roundModelId) {
    const result = await validateCandidate(roundModelId, validateConnector);
    if ('notFound' in result) {
      onFallback?.(new NightshiftModelNotFoundError(roundModelId));
    } else {
      selectedConnectorId = result.connectorId;
    }
  }

  if (selectedConnectorId === undefined) {
    const defaultModelId = NIGHTSHIFT_DEFAULT_MODELS[step];
    const result = await validateCandidate(defaultModelId, validateConnector);
    if ('notFound' in result) {
      throw new NightshiftModelNotFoundError(defaultModelId);
    }
    selectedConnectorId = result.connectorId;
  }

  const restriction = await getModelRestriction();
  if (!restriction.defaultOnly || selectedConnectorId === restriction.defaultConnectorId) {
    return selectedConnectorId;
  }

  throw new NightshiftModelBlockedError(selectedConnectorId, restriction.defaultConnectorId);
};
