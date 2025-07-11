/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertInstanceState as State, AlertInstanceContext as Context } from '../../types';
import { mappers } from './mappers';
import type { AlertMapperFn, AlertsResult, MapperContext } from './types';

function asyncPipe<S extends State, C extends Context, G extends string, R extends string>(
  ...fns: AlertMapperFn[]
) {
  return async (input: AlertsResult<S, C, G>, context: MapperContext<S, C, G, R>) => {
    let acc = input;
    for (const mapper of fns) {
      acc = await mapper({ alerts: acc, context });
    }
    return acc;
  };
}

export async function mapAlerts<
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  categorizedAlerts: AlertsResult<S, C, G>,
  mapperContext: MapperContext<S, C, G, R>
): Promise<AlertsResult<S, C, G>> {
  return await asyncPipe<S, C, G, R>(...Object.values(mappers))(categorizedAlerts, mapperContext);
}
