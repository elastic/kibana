/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';
import { matchesGlob } from './matches_glob';

/** An index expression an ES|QL query reads. */
export interface EsqlSourceTarget {
  /** The command that reads it, such as `from`, `ts` or `join`. */
  command: string;
  /** The remote cluster alias of a cross-cluster source; missing for a local one. */
  prefix?: string;
  index: string;
}

/**
 * The index expressions an ES|QL query reads, in query order, across every command that names one
 * and the subqueries nested in them. A quoted comma list yields one target per expression, and
 * an ENRICH policy is not a target.
 */
export const getEsqlSourceTargets = (query: string): EsqlSourceTarget[] => {
  const { root } = Parser.parse(query);
  const targets: EsqlSourceTarget[] = [];
  Walker.walk(root, {
    visitSource: ({ prefix, index, name, sourceType }, parent) => {
      if (sourceType === 'policy') {
        return;
      }
      const command = parent?.type === 'command' ? parent.name : '';
      for (const expression of (index?.valueUnquoted ?? name).split(',')) {
        const trimmed = expression.trim();
        if (trimmed !== '') {
          targets.push({
            command,
            ...(prefix !== undefined && { prefix: prefix.valueUnquoted }),
            index: trimmed,
          });
        }
      }
    },
  });
  return targets;
};

export const isCircularSource = (query: string, dest: string): boolean =>
  getEsqlSourceTargets(query).some(
    ({ prefix, index }) => prefix === undefined && matchesGlob(index, dest)
  );
