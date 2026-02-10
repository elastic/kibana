/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Identifies the kind of inline action. Each kind maps to
 * a different dialog/panel that opens when the trigger fires.
 */
export type InlineActionKind = 'mention' | 'command';

/**
 * Defines a trigger that activates an inline action.
 */
export interface TriggerDefinition {
  /** Unique identifier for this trigger */
  readonly id: string;
  /** The kind of inline action this trigger opens */
  readonly kind: InlineActionKind;
  /** The character sequence that activates the trigger (e.g. '@', '/p') */
  readonly sequence: string;
  /**
   * Optional parameters to pass to the dialog when this trigger fires.
   * Enables differentiating behavior for triggers of the same kind.
   */
  readonly params?: Record<string, unknown>;
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
