/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The queries a draft will run and save, main query first. An empty one is a draft that was never
 * filled in and is left out, and without a main query there is nothing to run: the extra queries
 * only make sense after it.
 */
export const getRunnableQueries = (
  main: string,
  additional: ReadonlyArray<{ text: string }>
): string[] =>
  main.trim() ? [main, ...additional.map(({ text }) => text).filter((text) => text.trim())] : [];
