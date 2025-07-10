/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message, MessageContent } from '@kbn/inference-common';
import { AnonymizationRecord } from './types';

export function messageFromAnonymizationRecords(map: AnonymizationRecord): Message {
  const anonymizableMessage = map;
  const { content, contentParts, data } = anonymizableMessage;

  return {
    ...(content ? { content } : {}),
    ...(contentParts ? { content: JSON.parse(contentParts) as MessageContent[] } : {}),
    ...(data ? JSON.parse(data) : {}),
  };
}
