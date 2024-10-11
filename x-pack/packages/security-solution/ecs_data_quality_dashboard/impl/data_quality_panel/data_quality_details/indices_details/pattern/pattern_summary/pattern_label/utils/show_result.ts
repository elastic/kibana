/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ShowResultProps<T> {
  incompatible: T;
  indices: T;
  indicesChecked: T;
}

export const showResult = <T extends number | undefined>(
  opts: ShowResultProps<T>
): opts is ShowResultProps<NonNullable<T>> =>
  opts.incompatible != null &&
  opts.indices != null &&
  opts.indicesChecked != null &&
  opts.indices === opts.indicesChecked;
