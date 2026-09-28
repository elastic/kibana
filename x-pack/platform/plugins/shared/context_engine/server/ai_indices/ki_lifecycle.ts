/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { Parser, Walker, WrappingPrettyPrinter, mutate } from '@elastic/esql';
import type { ESQLAstQueryExpression } from '@elastic/esql/types';
import type { AiIndexDest } from '../../common/http_api/ai_indices';

const KI_LIFECYCLE_STATUS_FIELD = 'governance.lifecycle.status';
const KI_EXPIRES_AT_FIELD = 'expires_at';
const GOVERNANCE_FIELD = 'governance';

export const LIFECYCLE_FILTERS = [
  `WHERE ${KI_LIFECYCLE_STATUS_FIELD} IS NULL OR ${KI_LIFECYCLE_STATUS_FIELD} == "active"`,
  `WHERE ${KI_EXPIRES_AT_FIELD} IS NULL OR ${KI_EXPIRES_AT_FIELD} > NOW()`,
];

const DROP_GOVERNANCE = `DROP ${GOVERNANCE_FIELD}.*`;

/** Keeps the newest document per `id`; `_id` breaks timestamp ties. Needs `METADATA _id`. */
export const LATEST_REVISION = [
  'EVAL id = COALESCE(id, _id)',
  'INLINE STATS latest = MAX(@timestamp) BY id',
  'WHERE @timestamp == latest',
  'INLINE STATS latest_doc = MAX(_id) BY id',
  'WHERE _id == latest_doc',
  'DROP latest, latest_doc',
];

/** The commands after `FROM` that select the current, active, unexpired KIs. */
export const kiLifecyclePipeline = (type: AiIndexDest['type']): string[] =>
  type === 'data_stream' ? [...LATEST_REVISION, ...LIFECYCLE_FILTERS] : LIFECYCLE_FILTERS;

/** Unset or `active` status, and not yet expired: the DSL form of the lifecycle filters. */
export const activeKiFilters: QueryDslQueryContainer[] = [
  {
    bool: {
      should: [
        { bool: { must_not: { exists: { field: KI_LIFECYCLE_STATUS_FIELD } } } },
        { term: { [KI_LIFECYCLE_STATUS_FIELD]: 'active' } },
      ],
      minimum_should_match: 1,
    },
  },
  {
    bool: {
      should: [
        { bool: { must_not: { exists: { field: KI_EXPIRES_AT_FIELD } } } },
        { range: { [KI_EXPIRES_AT_FIELD]: { gt: 'now' } } },
      ],
      minimum_should_match: 1,
    },
  },
];

const globToRegExp = (pattern: string): RegExp =>
  new RegExp(
    `^${pattern
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')}$`
  );

const overlaps = (source: string, dest: string): boolean =>
  globToRegExp(source).test(dest) || globToRegExp(dest).test(source);

/** A query that names `governance` or `expires_at` handles lifecycle itself. */
const handlesLifecycle = (root: ESQLAstQueryExpression): boolean => {
  let found = false;
  Walker.walk(root, {
    visitColumn: ({ parts }) => {
      if (parts[0] === GOVERNANCE_FIELD || parts[0] === KI_EXPIRES_AT_FIELD) {
        found = true;
      }
    },
  });
  return found;
};

/**
 * Inserts the lifecycle pipeline after `FROM` when the query reads a registered AI index dest, so
 * deleted, expired and superseded KIs are left out by default and `governance` stays out of the
 * result. A query that names a lifecycle field keeps its own filters; a data stream dest still gets
 * the newest revision per `id`. A query the parser rejects is returned unchanged.
 */
export const applyKiLifecycle = (query: string, dests: AiIndexDest[]): string => {
  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return query;
  }
  const sources = [...mutate.commands.from.sources.list(root)].map(
    (source) => source.index?.valueUnquoted ?? source.name
  );
  const matched = dests.filter(({ value }) =>
    value.split(',').some((dest) => sources.some((source) => overlaps(source, dest)))
  );
  if (matched.length === 0) {
    return query;
  }
  const isDataStream = matched.some((dest) => dest.type === 'data_stream');
  const pipeline = [
    ...(isDataStream ? LATEST_REVISION : []),
    ...(handlesLifecycle(root) ? [] : [...LIFECYCLE_FILTERS, DROP_GOVERNANCE]),
  ];
  if (pipeline.length === 0) {
    return query;
  }
  if (isDataStream) {
    mutate.commands.from.metadata.upsert(root, '_id');
  }
  const { root: lifecycle } = Parser.parse(`FROM x | ${pipeline.join(' | ')}`);
  root.commands.splice(1, 0, ...lifecycle.commands.slice(1));
  return WrappingPrettyPrinter.print(root, { wrap: 80, pipeTab: '' });
};
