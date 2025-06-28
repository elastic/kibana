/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message } from '@kbn/inference-common';
import { isEmpty } from 'lodash';
import { getAnonymizableMessageParts } from './get_anonymizable_message_parts';
import { AnonymizationRecord } from './types';

export function messageToAnonymizationRecords(message: Message): AnonymizationRecord {
  const anonymizableMessage = getAnonymizableMessageParts(message);
  const { content, ...rest } = anonymizableMessage;

  return {
    ...(content && typeof content === 'string' ? { content } : {}),
    ...(content && typeof content !== 'string' ? { contentParts: JSON.stringify(content) } : {}),
    ...(!isEmpty(rest) ? { data: JSON.stringify(rest) } : {}),
  };
}
