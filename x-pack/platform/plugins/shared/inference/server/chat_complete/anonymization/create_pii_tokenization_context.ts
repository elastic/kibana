/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac, randomBytes } from 'crypto';
import type { PiiTokenizationContext } from '../../workflow_anonymization_capabilities';
import type { PiiDetectionContext } from './pii_detection_context';
import { getEntityMask } from './get_entity_mask';

const deriveExecutionScope = ({
  serverSalt,
  sessionId,
}: {
  serverSalt: string;
  sessionId?: string;
}): string => {
  if (!sessionId) {
    return randomBytes(32).toString('hex');
  }

  return createHmac('sha256', serverSalt).update(`session:${sessionId}`).digest('hex');
};

export const createPiiTokenizationContext = ({
  detectionContext,
  serverSalt,
  sessionId,
}: {
  detectionContext: PiiDetectionContext;
  serverSalt: string;
  sessionId?: string;
}): PiiTokenizationContext => {
  const executionScope = deriveExecutionScope({ serverSalt, sessionId });

  return {
    detectEntities: (options) => detectionContext.detectEntities(options),
    tokenize: (entityClass, value) =>
      getEntityMask({ class_name: entityClass, value }, executionScope),
  };
};
