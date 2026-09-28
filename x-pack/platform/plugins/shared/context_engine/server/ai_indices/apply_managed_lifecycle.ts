/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, WrappingPrettyPrinter, mutate } from '@elastic/esql';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { kiViewPipeline } from './ki_view';

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
 * Applies the view's lifecycle pipeline to a query that reads a managed backing store. Managed AI
 * indices have no view: the space filter runs on a view's output, where nested fields are absent.
 */
export const applyManagedLifecycle = (query: string, managedDests: AiIndexDest[]): string => {
  if (managedDests.length === 0) {
    return query;
  }
  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return query;
  }
  const sources = [...mutate.commands.from.sources.list(root)].map(
    (source) => source.index?.valueUnquoted ?? source.name
  );
  const matched = managedDests.filter(({ value }) =>
    value.split(',').some((dest) => sources.some((source) => overlaps(source, dest)))
  );
  if (matched.length === 0) {
    return query;
  }
  const type = matched.some((dest) => dest.type === 'data_stream') ? 'data_stream' : 'index';
  const { root: lifecycle } = Parser.parse(`FROM x | ${kiViewPipeline(type).join(' | ')}`);
  root.commands.splice(1, 0, ...lifecycle.commands.slice(1));
  return WrappingPrettyPrinter.print(root, { wrap: 80, pipeTab: '' });
};
