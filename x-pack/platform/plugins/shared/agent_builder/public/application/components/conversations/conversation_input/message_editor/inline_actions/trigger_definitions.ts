/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TriggerDefinition } from './types';
import { TriggerId } from './types';

const TRIGGER_DEFINITIONS: readonly TriggerDefinition[] = [
  { id: TriggerId.Attachment, sequence: '@', name: 'Attachment' },
  { id: TriggerId.Prompt, sequence: '/p', name: 'Prompt' },
];

// Sorted once at module load — longest sequence first for greedy matching
export const sortedTriggerDefinitions = Array.from(TRIGGER_DEFINITIONS).sort(
  (a, b) => b.sequence.length - a.sequence.length
);
