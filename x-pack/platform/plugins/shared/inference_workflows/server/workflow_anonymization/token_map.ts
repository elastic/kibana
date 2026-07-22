/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TokenMap } from '../../common/workflow_anonymization';

export const replaceKnownOriginals = (value: string, tokenMap: TokenMap): string =>
  Object.entries(tokenMap)
    .sort(([, left], [, right]) => right.original.length - left.original.length)
    .reduce(
      (current, [token, entry]) =>
        entry.original ? current.split(entry.original).join(token) : current,
      value
    );

export const restoreTokens = (value: string, tokenMap: TokenMap): string =>
  Object.entries(tokenMap)
    .sort(([left], [right]) => right.length - left.length)
    .reduce(
      (current, [token, entry]) => (token ? current.split(token).join(entry.original) : current),
      value
    );
