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

type GetSLOGroupingsParams = t.TypeOf<typeof getSLOGroupingsParamsSchema.props.query>;
interface GetSLOGroupingsResponse {
  groupingKey: string;
  values: string[];
  afterKey: string | undefined;
}

export { getSLOGroupingsParamsSchema };
export type { GetSLOGroupingsResponse, GetSLOGroupingsParams };
