/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** How much of the Isomer input budget a value uses. */
export interface InputSize {
  /** Every object, array and leaf, once each. */
  values: number;
  /** Every object key and string, and every other leaf as `String` prints it. */
  characters: number;
}

/**
 * Measures `value` the way the Isomer SDK's `checkInputBudget` counts it, so sizes compare
 * directly with the budget. Iterative, so deep values don't exhaust the stack.
 */
export const measureInput = (value: unknown): InputSize => {
  let values = 0;
  let characters = 0;
  const pending: unknown[] = [value];
  while (pending.length > 0) {
    const current = pending.pop();
    values += 1;
    if (Array.isArray(current)) {
      pending.push(...current);
    } else if (current !== null && typeof current === 'object') {
      for (const [key, child] of Object.entries(current)) {
        characters += key.length;
        pending.push(child);
      }
    } else {
      characters += String(current).length;
    }
  }
  return { values, characters };
};
