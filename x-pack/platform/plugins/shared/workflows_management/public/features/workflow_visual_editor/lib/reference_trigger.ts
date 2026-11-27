/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A reference being typed: it began at `start` with `triggerLength` brace characters (`{{`, `{`),
 * or with none when the insert button started it. What is typed after them filters the references.
 */
export interface TriggerSession {
  readonly start: number;
  readonly triggerLength: 0 | 1 | 2;
}

interface Edit {
  readonly text: string;
  readonly caret: number;
  /** The one character the user just typed; undefined for a deletion, a paste or an undo. */
  readonly typed: string | undefined;
}

/**
 * The session a typed `{` starts: `{{` always, a single `{` only where `{` is not syntax. Only a
 * typed character opens one, so deleting back to `{{`, pasting and undoing never do.
 */
export const openTrigger = ({
  text,
  caret,
  typed,
  openOnBrace,
}: Edit & { readonly openOnBrace: boolean }): TriggerSession | undefined => {
  if (typed !== '{') return undefined;
  if (caret >= 2 && text.slice(caret - 2, caret) === '{{') {
    return { start: caret - 2, triggerLength: 2 };
  }
  return openOnBrace ? { start: caret - 1, triggerLength: 1 } : undefined;
};

/**
 * Whether the caret is still on the reference being typed: after the trigger and before any
 * closing brace or line end. A caret move changes nothing else, so it needs no more than this.
 */
export const caretInTrigger = (session: TriggerSession, text: string, caret: number): boolean =>
  caret >= session.start + session.triggerLength &&
  !/[}\n]/.test(text.slice(session.start + session.triggerLength, caret));

/**
 * The session after an edit, or undefined when it is over: the trigger was deleted or edited, the
 * caret left it, or the reference was closed or the line ended.
 */
export const keepTrigger = (
  session: TriggerSession,
  { text, caret, typed }: Edit
): TriggerSession | undefined => {
  const { start } = session;
  const opens = session.triggerLength === 1 && typed === '{' && text.slice(start, caret) === '{{';
  const current: TriggerSession = opens ? { start, triggerLength: 2 } : session;
  if (text.slice(start, start + current.triggerLength) !== '{'.repeat(current.triggerLength)) {
    return undefined;
  }
  return caretInTrigger(current, text, caret) ? current : undefined;
};

/** What was typed after the trigger, without the padding space. */
export const triggerQuery = (session: TriggerSession, text: string, caret: number): string =>
  text.slice(session.start + session.triggerLength, caret).trim();

/**
 * What a pick replaces: from the trigger to the caret, and a closing `}}` that follows it when
 * the trigger was typed (a session opened by a button has no trigger and leaves it alone).
 */
export const triggerRange = (
  session: TriggerSession,
  text: string,
  caret: number
): { readonly start: number; readonly end: number } => {
  const closing = session.triggerLength > 0 ? /^\s*\}\}/.exec(text.slice(caret)) : null;
  return { start: session.start, end: caret + (closing ? closing[0].length : 0) };
};
