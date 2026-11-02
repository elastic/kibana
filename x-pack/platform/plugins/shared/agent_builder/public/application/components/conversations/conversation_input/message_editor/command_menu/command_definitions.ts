/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { Mentions } from './menus/mentions';
import { Skills } from './menus/skills';
import { Sml } from './menus/sml';
import type { CommandDefinition } from './types';
import { CommandId } from './types';
import { useExperimentalFeatures } from '../../../../../hooks/use_experimental_features';
import { useCanMention } from '../../mentions/use_can_mention';

const mentionCommandName = i18n.translate(
  'xpack.agentBuilder.conversationInput.commandMenu.mentionCommandName',
  { defaultMessage: 'Mention' }
);

const semanticKnowledgeCommandName = i18n.translate(
  'xpack.agentBuilder.conversationInput.commandMenu.semanticKnowledgeCommandName',
  { defaultMessage: 'Semantic knowledge' }
);

// When adding a new command, also add its data prefetch hook to use_command_menu_prefetch.ts
const COMMAND_DEFINITIONS: readonly CommandDefinition[] = [
  { id: CommandId.Skill, scheme: 'skill', sequence: '/', name: 'Skill', menuComponent: Skills },
  {
    id: CommandId.Sml,
    scheme: 'sml',
    sequence: '#',
    legacySequences: ['@'],
    name: semanticKnowledgeCommandName,
    menuComponent: Sml,
    experimental: true,
  },
  {
    id: CommandId.Mention,
    scheme: 'mention',
    sequence: '@',
    name: mentionCommandName,
    menuComponent: Mentions,
    experimental: true,
  },
];

// Sorted once at module load — longest sequence first for greedy matching
export const sortedCommandDefinitions = Array.from(COMMAND_DEFINITIONS).sort(
  (a, b) => b.sequence.length - a.sequence.length
);

export const getCommandDefinition = (commandId: string) => {
  const commandDefinition = sortedCommandDefinitions.find((c) => c.id === commandId);
  return commandDefinition;
};

export const getCommandDefinitionByScheme = (scheme: string) => {
  const commandDefinition = sortedCommandDefinitions.find((c) => c.scheme === scheme);
  return commandDefinition;
};

/**
 * Returns the list of command definitions available based on feature flags.
 * The `/` skill command is always available (GA).
 * The `#` SML command lives inside Agent Builder, so it requires only the
 * Agent Builder experimental flag. The `@` mention command also needs a shared chat.
 */
export const useAvailableCommandDefinitions = (): readonly CommandDefinition[] => {
  const isExperimentalEnabled = useExperimentalFeatures();
  const canMention = useCanMention();

  return useMemo(
    () =>
      sortedCommandDefinitions.filter(({ id, experimental }) =>
        id === CommandId.Mention ? canMention : !experimental || isExperimentalEnabled
      ),
    [isExperimentalEnabled, canMention]
  );
};
