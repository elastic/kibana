/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toBooleanRt } from '@kbn/io-ts-utils';

const getSLOGroupingsParamsSchema = t.type({
  path: t.type({ id: t.string }),
  query: t.intersection([
    t.type({
      instanceId: t.string,
      groupingKey: t.string,
    }),
    t.partial({
      search: t.string,
      afterKey: t.string,
      size: t.string,
      excludeStale: toBooleanRt,
      remoteName: t.string,
    }),
  ]),
});

const getSLOGroupingsResponseSchema = t.type({
  groupingKey: t.string,
  values: t.array(t.string),
  afterKey: t.union([t.string, t.undefined]),
});

type GetSLOGroupingsParams = t.TypeOf<typeof getSLOGroupingsParamsSchema.props.query>;
type GetSLOGroupingsResponse = t.OutputOf<typeof getSLOGroupingsResponseSchema>;

export { getSLOGroupingsParamsSchema, getSLOGroupingsResponseSchema };
export type { GetSLOGroupingsResponse, GetSLOGroupingsParams };
