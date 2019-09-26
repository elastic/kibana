/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * This helper automatically handles matching pairs.
 * Specifically, it does the following:
 *
 * 1. If the key is a closer, and the character in front of the cursor is the
 *    same, simply move the cursor forward.
 * 2. If the key is an opener, insert the opener at the beginning of the
 *    selection, and the closer at the end of the selection, and move the
 *    selection forward.
 * 3. If the backspace is hit, and the characters before and after the cursor
 *    are a pair, remove both characters and move the cursor backward.
 */

const pairs = ['()', '[]', '{}', `''`, '""'];
const openers = pairs.map(pair => pair[0]);
const closers = pairs.map(pair => pair[1]);

interface MatchPairsOptions {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  key: string;
  metaKey: boolean;
  updateQuery: (query: string, selectionStart: number, selectionEnd: number) => void;
  preventDefault: () => void;
}

export function matchPairs({
  value,
  selectionStart,
  selectionEnd,
  key,
  metaKey,
  updateQuery,
  preventDefault,
}: MatchPairsOptions) {
  if (shouldMoveCursorForward(key, value, selectionStart, selectionEnd)) {
    preventDefault();
    updateQuery(value, selectionStart + 1, selectionEnd + 1);
  } else if (shouldInsertMatchingCloser(key, value, selectionStart, selectionEnd)) {
    preventDefault();
    const newValue =
      value.substr(0, selectionStart) +
      key +
      value.substring(selectionStart, selectionEnd) +
      closers[openers.indexOf(key)] +
      value.substr(selectionEnd);
    updateQuery(newValue, selectionStart + 1, selectionEnd + 1);
  } else if (shouldRemovePair(key, metaKey, value, selectionStart, selectionEnd)) {
    preventDefault();
    const newValue = value.substr(0, selectionEnd - 1) + value.substr(selectionEnd + 1);
    updateQuery(newValue, selectionStart - 1, selectionEnd - 1);
  }
}

function shouldMoveCursorForward(
  key: string,
  value: string,
  selectionStart: number,
  selectionEnd: number
) {
  if (!closers.includes(key)) {
    return false;
  }

  // Never move selection forward for multi-character selections
  if (selectionStart !== selectionEnd) {
    return false;
  }

  // Move selection forward if the key is the same as the closer in front of the selection
  return value.charAt(selectionEnd) === key;
}

function shouldInsertMatchingCloser(
  key: string,
  value: string,
  selectionStart: number,
  selectionEnd: number
) {
  if (!openers.includes(key)) {
    return false;
  }

  // Always insert for multi-character selections
  if (selectionStart !== selectionEnd) {
    return true;
  }

  const precedingCharacter = value.charAt(selectionStart - 1);
  const followingCharacter = value.charAt(selectionStart + 1);

  // Don't insert if the preceding character is a backslash
  if (precedingCharacter === '\\') {
    return false;
  }

  // Don't insert if it's a quote and the either of the preceding/following characters is alphanumeric
  return !(
    ['"', `'`].includes(key) &&
    (isAlphanumeric(precedingCharacter) || isAlphanumeric(followingCharacter))
  );
}

function shouldRemovePair(
  key: string,
  metaKey: boolean,
  value: string,
  selectionStart: number,
  selectionEnd: number
) {
  if (key !== 'Backspace' || metaKey) {
    return false;
  }

  // Never remove for multi-character selections
  if (selectionStart !== selectionEnd) {
    return false;
  }

  // Remove if the preceding/following characters are a pair
  return pairs.includes(value.substr(selectionEnd - 1, 2));
}

function isAlphanumeric(value = '') {
  return value.match(/[a-zA-Z0-9_]/);
}
