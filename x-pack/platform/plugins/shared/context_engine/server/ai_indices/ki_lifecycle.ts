/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker, WrappingPrettyPrinter, mutate } from '@elastic/esql';
import type { ESQLAstQueryExpression } from '@elastic/esql/types';
import type { AiIndexDest } from '../../common/http_api/ai_indices';

const KI_LIFECYCLE_STATUS_FIELD = 'governance.lifecycle.status';
const KI_EXPIRES_AT_FIELD = 'expires_at';
const GOVERNANCE_FIELD = 'governance';

const LIFECYCLE_FILTERS = [
  `WHERE ${KI_LIFECYCLE_STATUS_FIELD} IS NULL OR ${KI_LIFECYCLE_STATUS_FIELD} == "active"`,
  `WHERE ${KI_EXPIRES_AT_FIELD} IS NULL OR ${KI_EXPIRES_AT_FIELD} > NOW()`,
];

const DROP_GOVERNANCE = `DROP ${GOVERNANCE_FIELD}.*`;

/** Single-target collapse to the newest document per `id`; `_id` breaks ties. Needs `METADATA _id`. */
const LATEST_REVISION = [
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

const globToRegExp = (pattern: string): RegExp =>
  new RegExp(
    `^${pattern
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')}$`
  );

const overlaps = (source: string, dest: string): boolean =>
  globToRegExp(source).test(dest) || globToRegExp(dest).test(source);

/** Which defaults the query already handles: a top-level `WHERE` per filter, any `governance.*` for the drop. */
const namedLifecycleFields = (root: ESQLAstQueryExpression) => {
  const named = { status: false, expiry: false, governance: false };
  Walker.walk(root, {
    visitColumn: ({ parts }) => {
      named.governance ||= parts[0] === GOVERNANCE_FIELD;
    },
  });
  for (const command of mutate.commands.where.list(root)) {
    Walker.walk(command, {
      visitColumn: ({ parts }) => {
        named.status ||= parts.join('.') === KI_LIFECYCLE_STATUS_FIELD;
        named.expiry ||= parts[0] === KI_EXPIRES_AT_FIELD;
      },
    });
  }
  return named;
};

/**
 * Multi-target collapse keyed by data stream (resolved from the `.ds-<stream>-<date>-<generation>`
 * backing index name, plain indices by `_index`) and `id`; a missing `@timestamp` sorts first.
 * Needs `METADATA _id, _index`.
 */
const latestRevisionByTarget = (streams: string[]): string[] => [
  'EVAL id = COALESCE(id, _id)',
  'EVAL ki_revision_time = COALESCE(@timestamp, TO_DATETIME("1970-01-01T00:00:00Z"))',
  `EVAL ki_target = CASE(${streams
    .flatMap((stream) => [`_index LIKE ".ds-${stream}-????.??.??-*"`, `"${stream}"`])
    .join(', ')}, _index)`,
  'INLINE STATS latest = MAX(ki_revision_time) BY ki_target, id',
  'WHERE ki_revision_time == latest',
  'INLINE STATS latest_doc = MAX(_id) BY ki_target, id',
  'WHERE _id == latest_doc',
  'DROP latest, latest_doc, ki_revision_time, ki_target',
];

/**
 * Inserts the lifecycle pipeline after `FROM` when the query reads a registered AI index dest.
 * A top-level `WHERE` on a lifecycle field replaces that filter. Data streams always get the
 * revision collapse. A query the parser rejects is returned unchanged.
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
  const streams = matched.filter(({ type }) => type === 'data_stream').map(({ value }) => value);
  const named = namedLifecycleFields(root);
  const [statusFilter, expiryFilter] = LIFECYCLE_FILTERS;
  const pipeline = [
    ...(streams.length > 0 ? latestRevisionByTarget(streams) : []),
    ...(named.status ? [] : [statusFilter]),
    ...(named.expiry ? [] : [expiryFilter]),
    ...(named.governance ? [] : [DROP_GOVERNANCE]),
  ];
  if (pipeline.length === 0) {
    return query;
  }
  if (streams.length > 0) {
    mutate.commands.from.metadata.upsert(root, '_id');
    mutate.commands.from.metadata.upsert(root, '_index');
  }
  const { root: lifecycle } = Parser.parse(`FROM x | ${pipeline.join(' | ')}`);
  root.commands.splice(1, 0, ...lifecycle.commands.slice(1));
  return WrappingPrettyPrinter.print(root, { wrap: 80, pipeTab: '' });
};
