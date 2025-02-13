/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { durationType } from '../../schema';
import { allOrAnyString } from '../../schema/common';

const getSLOBurnRatesResponseSchema = t.type({
  burnRates: t.array(
    t.type({
      name: t.string,
      burnRate: t.number,
      sli: t.number,
    })
  ),
});

const getSLOBurnRatesParamsSchema = t.type({
  path: t.type({ id: t.string }),
  body: t.intersection([
    t.type({
      instanceId: allOrAnyString,
      windows: t.array(
        t.type({
          name: t.string,
          duration: durationType,
        })
      ),
    }),
    t.partial({ remoteName: t.string }),
  ]),
});

type GetSLOBurnRatesResponse = t.OutputOf<typeof getSLOBurnRatesResponseSchema>;

export { getSLOBurnRatesParamsSchema, getSLOBurnRatesResponseSchema };
export type { GetSLOBurnRatesResponse };
