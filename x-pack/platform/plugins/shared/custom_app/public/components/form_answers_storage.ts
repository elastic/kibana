/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_STATE_STRING_LENGTH, type FormField } from '@kbn/custom-app-common';

/** What a form has been typed into, by the value each field sets. */
export type FormAnswers = Readonly<Record<string, string>>;

export const getFormAnswersKey = (appId: string, nodeId: string): string =>
  `customApp:formAnswers:${appId}:${nodeId}`;

const getStorage = (): Storage | undefined => {
  try {
    return window.sessionStorage;
  } catch {
    // Storage can be refused, in a private window for instance. Then nothing is kept.
    return undefined;
  }
};

/**
 * What was typed and not sent, from this tab's session. It is read as untrusted, since the storage
 * can hold anything: only text for a field the form has, and no longer than a value can be.
 */
export const readFormAnswers = (key: string, fields: readonly FormField[]): FormAnswers => {
  try {
    const stored: unknown = JSON.parse(getStorage()?.getItem(key) ?? 'null');
    if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return {};
    const answers = stored as Record<string, unknown>;
    return Object.fromEntries(
      fields.flatMap(({ bind }) => {
        const answer = Object.prototype.hasOwnProperty.call(answers, bind)
          ? answers[bind]
          : undefined;
        return typeof answer === 'string' && answer.length <= MAX_STATE_STRING_LENGTH
          ? [[bind, answer]]
          : [];
      })
    );
  } catch {
    return {};
  }
};

/** Keeps what was typed, or nothing at all when nothing was. */
export const writeFormAnswers = (key: string, answers: FormAnswers): void => {
  try {
    const storage = getStorage();
    if (!storage) return;
    if (Object.keys(answers).length === 0) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, JSON.stringify(answers));
    }
  } catch {
    // A full or refused storage only means that a refresh will not bring the answers back.
  }
};
