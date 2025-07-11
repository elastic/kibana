/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAlertFlapping } from '../../lib/flapping/is_alert_flapping';
import type { AlertMapperFn, MapperOpts } from './types';
import type { AlertInstanceState as State, AlertInstanceContext as Context } from '../../types';

export const applyFlapping: AlertMapperFn = async <
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: MapperOpts<S, C, G, R>
) => {
  const logger = opts.context.alertsClientContext.logger.get('applyFlapping');
  logger.info(`Applying flapping mapping function`);

  return opts.alerts.map(({ alert, category }) => {
    // determine if the alert is flapping
    const flapping = isAlertFlapping(opts.context.flappingSettings, alert);
    alert.setFlapping(flapping);
    return { alert, category };
  });
};
