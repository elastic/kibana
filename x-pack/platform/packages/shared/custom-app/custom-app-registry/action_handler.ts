/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** What the app gives the code that carries out an action in the browser. */
export interface ActionHandlerContext {
  /** What the interaction that ran the action carries: a clicked row, or the new value of an input. */
  input: { row?: Readonly<Record<string, unknown>>; input?: unknown };
  /** The values of the app, as they are when the action is reached, so that one set before it counts. */
  state: Readonly<Record<string, string | number | boolean | readonly string[]>>;
  /** Says that the action, or part of it, was not carried out, and why. */
  drop: (reason: string) => void;
  /**
   * Hands something to the app to be done once the person has had their say, and the network. The
   * action cannot do it itself because it takes more than what is at hand: a dialog, a request.
   */
  request: (payload: unknown) => void;
}

/** Carries out an action at once, in the browser. Only the browser has one. */
export type ActionHandler<Action = never> = (action: Action, context: ActionHandlerContext) => void;
