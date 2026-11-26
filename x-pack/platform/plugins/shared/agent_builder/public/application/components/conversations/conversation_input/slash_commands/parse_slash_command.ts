/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlashCommand } from './types';

export interface ParsedSlashCommand {
  readonly command: SlashCommand;
  /** Text after the command name, trimmed. Empty for a bare command. */
  readonly args: string;
}

const SLASH_COMMAND_PATTERN = /^\/(\S+)(?:\s+([\s\S]*))?$/;

/**
 * Finds the slash command a message starts with.
 *
 * Only a leading `/name` followed by whitespace or the end of the message matches, so a
 * serialized skill badge (`[/name](skill://id)`) or a path such as `/var/log` is left alone.
 *
 * @param content - The serialized composer content.
 * @param commands - The commands that can be invoked.
 * @returns The matched command and its arguments, or `undefined` when the message is not a command.
 */
export const parseSlashCommand = (
  content: string,
  commands: readonly SlashCommand[]
): ParsedSlashCommand | undefined => {
  const match = SLASH_COMMAND_PATTERN.exec(content.trimStart());
  if (!match) {
    return undefined;
  }
  const [, typedName, args = ''] = match;
  const name = typedName.toLowerCase();
  const command = commands.find((candidate) => candidate.name === name);
  return command ? { command, args: args.trim() } : undefined;
};
