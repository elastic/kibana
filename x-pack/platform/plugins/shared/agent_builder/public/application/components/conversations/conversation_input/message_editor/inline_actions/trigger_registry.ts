/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TriggerDefinition } from './types';

const DEFAULT_TRIGGERS: readonly TriggerDefinition[] = [
  {
    id: 'mention',
    kind: 'mention',
    sequence: '@',
  },
  {
    id: 'command-prompt',
    kind: 'command',
    sequence: '/p',
    params: { subCommand: 'prompt' },
  },
];

/**
 * Creates a trigger registry from a list of trigger definitions.
 * Sorts triggers by sequence length descending to ensure longest-match-first,
 * preventing shorter triggers from shadowing longer ones.
 */
export const createTriggerRegistry = (
  triggers: readonly TriggerDefinition[] = DEFAULT_TRIGGERS
): readonly TriggerDefinition[] => {
  return [...triggers].sort((a, b) => b.sequence.length - a.sequence.length);
};
