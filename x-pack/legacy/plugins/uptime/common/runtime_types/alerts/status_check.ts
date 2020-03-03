/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

const OptionalProps = t.partial({
  filters: t.string,
});

const RequiredProps = t.type({
  locations: t.array(t.string),
  numTimes: t.number,
  timerange: t.type({
    from: t.string,
    to: t.string,
  }),
});

export const StatusCheckExecutorParamsType = t.intersection([OptionalProps, RequiredProps]);

export type StatusCheckExecutorParams = t.TypeOf<typeof StatusCheckExecutorParamsType>;
