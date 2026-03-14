/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum CommandId {
  Attachment = 'attachment',
  Prompt = 'prompt',
}

/**
 * Defines a command that activates an inline action.
 */
export interface CommandDefinition {
  /** Unique identifier for this command */
  readonly id: CommandId;
  /** The character sequence that activates the command (e.g. '@', '/p') */
  readonly sequence: string;
  /** Human readable name to be used for a11y */
  readonly name: string;
}

/**
 * The state of a currently active command.
 */
export interface ActiveCommand {
  /** The command definition that matched */
  readonly command: CommandDefinition;
  /** Character offset where the command sequence starts in the full input text */
  readonly commandStartOffset: number;
  /** The search query text typed after the command sequence */
  readonly query: string;
}

/**
 * Result of evaluating the current input text for command matches.
 */
export interface CommandMatchResult {
  /** Whether a command is currently active */
  readonly isActive: boolean;
  /** The active command details, or null */
  readonly activeCommand: ActiveCommand | null;
}

/**
 * Absolute position (relative to a containing element) for anchoring the
 * inline action popover.
 */
export interface AnchorPosition {
  readonly left: number;
  readonly top: number;
}
