/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `findQueries` early-returns on an empty stream list, while `getQueryLinks`
 * treats empty/undefined as "all streams". Resolve accessible stream names only
 * when a text query is present (search path). Unfiltered list/histogram calls
 * keep `undefined` so readers do not build a giant `IN` clause.
 */
export async function resolveStreamNamesForSearch(
  streamNames: string[] | undefined,
  textQuery: string | undefined,
  listStreams: () => Promise<Array<{ name: string }>>
): Promise<string[] | undefined> {
  if (streamNames?.length) {
    return streamNames;
  }
  if (!textQuery) {
    return undefined;
  }
  return (await listStreams()).map((stream) => stream.name);
}
