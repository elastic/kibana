/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { without } from 'lodash';
import { MessageRole } from '../../common';
import { ContextDefinition } from '../../common/functions/types';
import type { Message } from '../../common/types';

export function getAssistantSystemMessage({
  contexts,
}: {
  contexts: ContextDefinition[];
}): Message {
  const coreContext = contexts.find((context) => context.name === 'core')!;

  const otherContexts = without(contexts.concat(), coreContext);
  return {
    '@timestamp': new Date().toISOString(),
    message: {
      role: MessageRole.System as const,
      content: [coreContext, ...otherContexts].map((context) => context.description).join('\n'),
    },
  };
}
