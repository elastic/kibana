/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The queries a draft will run and save, in order. An empty one is a draft that was never filled
 * in and is left out, and without a first query there is nothing to run: the other queries only
 * make sense after it.
 */
type DraftText = ReadonlyArray<{ text: string }>;

const lastFilledIndex = (queries: DraftText) =>
  queries.reduce((last, { text }, index) => (text.trim() ? index : last), -1);

/**
 * The queries a draft runs and saves: those up to the last one filled in, none without a first
 * query. A blank query in between is kept as it is, since leaving it out would move the ones after
 * it to another `queries[n]`; see `findEmptyQueryPosition`.
 */
export const getRunnableQueries = (queries: DraftText): string[] =>
  queries[0]?.text.trim()
    ? queries.slice(0, lastFilledIndex(queries) + 1).map(({ text }) => text)
    : [];

/** The 1-based position of the first blank query that a filled one follows, if any. */
export const findEmptyQueryPosition = (queries: DraftText): number | undefined => {
  const last = lastFilledIndex(queries);
  // Nothing is filled in: static content, with no query that anything could shift.
  if (last < 0) return undefined;
  const index = queries.slice(0, last).findIndex(({ text }) => !text.trim());
  return index === -1 ? undefined : index + 1;
};
