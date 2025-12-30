/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toBooleanRt } from '@kbn/io-ts-utils';

const findSLOGroupingsParamsSchema = t.type({
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

type FindSLOGroupingsParams = t.TypeOf<typeof findSLOGroupingsParamsSchema.props.query>;

interface FindSLOGroupingsResponse {
  groupingKey: string;
  values: string[];
  afterKey: string | undefined;
}

export { findSLOGroupingsParamsSchema };
export type { FindSLOGroupingsResponse, FindSLOGroupingsParams };
