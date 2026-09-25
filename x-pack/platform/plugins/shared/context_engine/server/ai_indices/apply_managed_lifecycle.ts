/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, WrappingPrettyPrinter, mutate } from '@elastic/esql';
import { LIFECYCLE_FILTERS } from './ki_view';

const globToRegExp = (pattern: string): RegExp =>
  new RegExp(
    `^${pattern
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')}$`
  );

const overlaps = (source: string, dest: string): boolean =>
  globToRegExp(source).test(dest) || globToRegExp(dest).test(source);

/**
 * Applies the view's lifecycle pipeline to a query that reads a managed backing store, which has
 * no view because the space filter only applies to it directly.
 */
export const applyManagedLifecycle = (query: string, managedDests: string[]): string => {
  const dests = managedDests.flatMap((dest) => dest.split(','));
  if (dests.length === 0) {
    return query;
  }
  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return query;
  }
  const sources = [...mutate.commands.from.sources.list(root)].map(
    (source) => source.index?.valueUnquoted ?? source.name
  );
  if (!sources.some((source) => dests.some((dest) => overlaps(source, dest)))) {
    return query;
  }
  const { root: lifecycle } = Parser.parse(`FROM x | ${LIFECYCLE_FILTERS.join(' | ')}`);
  root.commands.splice(1, 0, ...lifecycle.commands.slice(1));
  return WrappingPrettyPrinter.print(root, { wrap: 80, pipeTab: '' });
};
