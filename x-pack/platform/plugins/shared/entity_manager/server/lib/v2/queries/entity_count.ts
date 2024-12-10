/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, last } from 'lodash';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { EntitySourceDefinition } from '../types';

const sourceCommand = ({ sources }: { sources: EntitySourceDefinition[] }) => {
  let command = `FROM ${sources.flatMap((source) => source.index_patterns).join(', ')}`;
  if (sources.length > 1) {
    command += ' METADATA _index';
  }

  return command;
};

const dslFilter = ({
  sources,
  filters,
  start,
  end,
}: {
  sources: EntitySourceDefinition[];
  filters: string[];
  start: string;
  end: string;
}) => {
  const globalFilters = filters.map((filter) => '(' + filter + ')').join(' AND ');
  const sourceFilters = sources
    .map((source) => {
      const filters = [...source.filters, ...source.identity_fields.map((field) => `${field}: *`)];

      if (source.timestamp_field) {
        filters.push(
          `${source.timestamp_field} >= "${start}" AND ${source.timestamp_field} <= "${end}"`
        );
      }

      filters.push(
        source.index_patterns
          .map((pattern) => `_index: "${pattern}*" OR _index: ".ds-${last(pattern.split(':'))}*"`)
          .join(' OR ')
      );

      return '(' + filters.map((filter) => '(' + filter + ')').join(' AND ') + ')';
    })
    .join(' OR ');

  return toElasticsearchQuery(
    fromKueryExpression(compact([globalFilters, `(${sourceFilters})`]).join(' AND '))
  );
};

const groupBy = ({ sources }: { sources: EntitySourceDefinition[] }) => {
  if (sources.length === 1) {
    return `STATS BY ${sources[0].identity_fields.join(', ')}`;
  }

  return `STATS BY entity.id`;
};

const sourcesEvalCommand = ({ sources }: { sources: EntitySourceDefinition[] }) => {
  if (sources.length === 1) {
    return;
  }

  const evals = sources.map((source, index) => {
    const condition = source.index_patterns
      .map(
        (pattern) => `_index LIKE "${pattern}*" OR _index LIKE ".ds-${last(pattern.split(':'))}*"`
      )
      .join(' OR ');

    return `EVAL is_source_${index} = ${condition}`;
  });

  return evals.join(' | ');
};

const idEvalCommand = ({ sources }: { sources: EntitySourceDefinition[] }) => {
  if (sources.length === 1) {
    return;
  }

  const conditions = sources.flatMap((source, index) => {
    return [
      `is_source_${index}`,
      source.identity_fields.length === 1
        ? source.identity_fields[0]
        : `CONCAT(${source.identity_fields.join(', ":", ')})`,
    ];
  });
  return `EVAL entity.id = CASE(${conditions.join(', ')})`;
};

const whereCommand = ({ sources }: { sources: EntitySourceDefinition[] }) => {
  if (sources.length === 1) {
    return;
  }

  return 'WHERE entity.id IS NOT NULL';
};

export function getEntityCountQuery({
  sources,
  filters,
  start,
  end,
}: {
  sources: EntitySourceDefinition[];
  filters: string[];
  start: string;
  end: string;
}) {
  const commands = compact([
    sourceCommand({ sources }),
    sourcesEvalCommand({ sources }),
    idEvalCommand({ sources }),
    whereCommand({ sources }),
    groupBy({ sources }),
    'STATS count = COUNT()',
  ]);

  const filter = dslFilter({ sources, filters, start, end });
  return { query: commands.join(' | '), filter };
}
