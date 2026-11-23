/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';
import { matchesGlob } from './matches_glob';

export const isCircularSource = (query: string, dest: string): boolean => {
  const { root } = Parser.parse(query);
  const targets: string[] = [];
  Walker.walk(root, {
    visitSource: ({ prefix, index, name }) => {
      if (prefix === undefined) {
        targets.push(...(index?.valueUnquoted ?? name).split(','));
      }
    },
  });
  return targets.some((target) => matchesGlob(target.trim(), dest));
};
