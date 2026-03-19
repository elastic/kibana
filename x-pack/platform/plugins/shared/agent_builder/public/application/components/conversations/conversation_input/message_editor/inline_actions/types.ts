/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum TriggerId {
  Attachment = 'attachment',
  Prompt = 'prompt',
}

/**
 * Defines a trigger that activates an inline action.
 */
export interface TriggerDefinition {
  /** Unique identifier for this trigger */
  readonly id: TriggerId;
  /** The character sequence that activates the trigger (e.g. '@', '/p') */
  readonly sequence: string;
}

/**
 * The state of a currently active trigger.
 */
export interface ActiveTrigger {
  /** The trigger definition that matched */
  readonly trigger: TriggerDefinition;
  /** Character offset where the trigger sequence starts in the full input text */
  readonly triggerStartOffset: number;
  /** The search query text typed after the trigger sequence */
  readonly query: string;
}

/**
 * Result of evaluating the current input text for trigger matches.
 */
export interface TriggerMatchResult {
  /** Whether a trigger is currently active */
  readonly isActive: boolean;
  /** The active trigger details, or null */
  readonly activeTrigger: ActiveTrigger | null;
}

/**
 * Absolute position (relative to a containing element) for anchoring the
 * inline action popover.
 */
export interface AnchorPosition {
  readonly left: number;
  readonly top: number;
}
