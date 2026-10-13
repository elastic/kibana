/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, type ESQLAstPromqlCommand, type ESQLMapEntry } from '@elastic/esql';

const TIME_RANGE_PARAMS: Readonly<Record<string, string>> = { start: '_tstart', end: '_tend' };

const isTimeRangeParamEntry = ({ key, value }: ESQLMapEntry): boolean => {
  const expectedParam = TIME_RANGE_PARAMS[key.name];
  return (
    expectedParam !== undefined &&
    value.type === 'literal' &&
    value.literalType === 'param' &&
    value.paramType === 'named' &&
    value.value === expectedParam
  );
};

// cheap check to avoid parsing queries that can't contain both options
const mayHaveTimeRangeParams = (query: string): boolean =>
  /\bpromql\b/i.test(query) &&
  Object.values(TIME_RANGE_PARAMS).every((param) => query.includes(`?${param}`));

/**
 * Remove `start=?_tstart end=?_tend` from a `PROMQL` source command, since the
 * visualization framework applies the time range to `PROMQL` queries by itself.
 *
 * Only the two options are removed; the rest of the query text is kept as-is. Queries
 * that are not `PROMQL`, fail to parse, or set only one of the options or other values
 * (e.g. absolute dates), are returned unchanged.
 */
export const removePromqlTimeRangeParams = (query: string): string => {
  if (!mayHaveTimeRangeParams(query)) {
    return query;
  }

  const { root, errors } = Parser.parse(query);
  const [sourceCommand] = root.commands;
  if (errors.length > 0 || sourceCommand?.name !== 'promql') {
    return query;
  }

  const { params } = sourceCommand as ESQLAstPromqlCommand;
  const timeRangeEntries = (params?.entries ?? []).filter(isTimeRangeParamEntry);
  if (timeRangeEntries.length !== Object.keys(TIME_RANGE_PARAMS).length) {
    return query;
  }

  // splice from the end so that earlier locations stay valid
  return timeRangeEntries.reduceRight((result, { location: { min, max } }) => {
    const afterEntry = result.slice(max + 1).replace(/^[ \t]+/, '');
    return `${result.slice(0, min)}${afterEntry}`;
  }, query);
};
