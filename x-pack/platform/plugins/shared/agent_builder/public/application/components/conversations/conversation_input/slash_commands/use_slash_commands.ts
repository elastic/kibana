/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useIsThreadsEnabled } from '../../../../hooks/use_is_threads_enabled';
import type { SlashCommand } from './types';
import { useThreadCommand } from './use_thread_command';

/** The slash commands of the composer, including those unavailable in the current conversation. */
export const useSlashCommands = (): readonly SlashCommand[] => {
  const isThreadsEnabled = useIsThreadsEnabled();
  const threadCommand = useThreadCommand();

  return useMemo(
    () => (isThreadsEnabled ? [threadCommand] : []),
    [isThreadsEnabled, threadCommand]
  );
};
