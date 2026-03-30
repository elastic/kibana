/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { CommandBadgeData } from '../command_badge/types';

export type { CommandBadgeData };

export enum CommandId {
  Attachment = 'attachment',
  Skill = 'skill',
}

/**
 * Props passed to a command menu component.
 */
export interface CommandMenuComponentProps {
  readonly query: string;
  readonly onSelect: (selection: CommandBadgeData) => void;
}

/**
 * Imperative handle exposed by a command menu component for keyboard delegation.
 */
export interface CommandMenuHandle {
  /**
   * Checks if keyboard event should be handled by the command menu
   */
  isKeyDownEventHandled: (event: React.KeyboardEvent) => boolean;
  /**
   * Handles keyboard event. Should only be called after receiving `true` from `isKeyDownEventHandled`.
   */
  handleKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * Defines a command that activates an inline action.
 */
export interface CommandDefinition {
  /** Unique identifier for this command */
  readonly id: CommandId;
  /** Unique identifier that is used for text representation in URL format (e.g. scheme://) */
  readonly scheme: string;
  /** The character sequence that activates the command (e.g. '@', '/') */
  readonly sequence: string;
  /** Human readable name to be used for a11y */
  readonly name: string;
  /** Component that will render the menu for this command */
  readonly menuComponent: React.ForwardRefExoticComponent<
    CommandMenuComponentProps & React.RefAttributes<CommandMenuHandle>
  >;
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
