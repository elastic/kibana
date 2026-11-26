/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseSlashCommand } from './parse_slash_command';
import type { SlashCommand } from './types';

const threadCommand: SlashCommand = {
  name: 'thread',
  description: 'Start new sub-conversation',
  iconType: 'comment',
  run: jest.fn(),
};

const commands = [threadCommand];

describe('parseSlashCommand', () => {
  it('matches a command followed by text, with the text as trimmed arguments', () => {
    expect(parseSlashCommand('/thread   dig into this  ', commands)).toEqual({
      command: threadCommand,
      args: 'dig into this',
    });
  });

  it('matches a bare command with empty arguments', () => {
    expect(parseSlashCommand('/thread', commands)).toEqual({ command: threadCommand, args: '' });
    expect(parseSlashCommand('/thread   ', commands)).toEqual({
      command: threadCommand,
      args: '',
    });
  });

  it('keeps line breaks inside the arguments', () => {
    expect(parseSlashCommand('/thread first line\nsecond line', commands)).toEqual({
      command: threadCommand,
      args: 'first line\nsecond line',
    });
  });

  it('matches a command after leading whitespace, in any case', () => {
    expect(parseSlashCommand('  /Thread text', commands)).toEqual({
      command: threadCommand,
      args: 'text',
    });
  });

  it('ignores a name that only starts with a command name', () => {
    expect(parseSlashCommand('/threads are great', commands)).toBeUndefined();
  });

  it('ignores a path', () => {
    expect(parseSlashCommand('/thread/log is empty', commands)).toBeUndefined();
    expect(parseSlashCommand('/var/log', commands)).toBeUndefined();
  });

  it('ignores a serialized skill badge', () => {
    expect(parseSlashCommand('[/thread](skill://thread) text', commands)).toBeUndefined();
  });

  it('ignores a command that is not at the start of the message', () => {
    expect(parseSlashCommand('please /thread this', commands)).toBeUndefined();
  });

  it('ignores an unknown command', () => {
    expect(parseSlashCommand('/recap', commands)).toBeUndefined();
    expect(parseSlashCommand('/thread text', [])).toBeUndefined();
  });
});
