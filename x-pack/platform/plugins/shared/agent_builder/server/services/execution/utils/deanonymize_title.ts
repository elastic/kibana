/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ConversationWithOperation } from './conversations';

// Exact token format: <ENTITY_CLASS>_<32 lowercase hex chars>, e.g. HOST_NAME_ae687f3b1c2d...
// Using exactly 32 hex chars avoids false positives on shorter hex-suffixed identifiers.
const ANONYMIZATION_TOKEN_PATTERN = /\b[A-Z][A-Z_]*_[0-9a-f]{32}\b/;

export interface CreateDeanonymizeTitleFnDeps {
  inference: InferenceServerStart;
  savedObjects: SavedObjectsServiceStart;
}

/**
 * Returns a deanonymizeTitle callback when anonymization is enabled and the conversation has a
 * replacementsId, or undefined otherwise. The callback deanonymizes the generated title and
 * guards against persisting raw tokens as the conversation title (which would be a PII leak
 * into an unencrypted field).
 */
export const createDeanonymizeTitleFn = ({
  anonymizationEnabled,
  conversation,
  deps,
  request,
  logger,
}: {
  anonymizationEnabled: boolean;
  conversation: ConversationWithOperation;
  deps: CreateDeanonymizeTitleFnDeps;
  request: KibanaRequest;
  logger: Logger;
}): ((title: string) => Promise<string>) | undefined => {
  if (!anonymizationEnabled || !conversation.replacements_id) {
    return undefined;
  }

  return async (title: string) => {
    const namespace = deps.savedObjects.getScopedClient(request).getCurrentNamespace() ?? 'default';
    const result = await deps.inference.deanonymizeText(
      namespace,
      conversation.replacements_id!,
      title
    );
    if (ANONYMIZATION_TOKEN_PATTERN.test(result)) {
      logger.warn(
        `[agent_builder.anonymization.title_guard] token_pattern_detected=true replacements_id=${conversation.replacements_id} — falling back to default title`
      );
      return 'New conversation';
    }
    return result;
  };
};
