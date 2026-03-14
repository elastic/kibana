/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandDefinition } from './types';
import { CommandId } from './types';

const COMMAND_DEFINITIONS: readonly CommandDefinition[] = [
  { id: CommandId.Attachment, sequence: '@', name: 'Attachment' },
  { id: CommandId.Prompt, sequence: '/p', name: 'Prompt' },
];

// Sorted once at module load — longest sequence first for greedy matching
export const sortedCommandDefinitions = Array.from(COMMAND_DEFINITIONS).sort(
  (a, b) => b.sequence.length - a.sequence.length
);
