/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerCollectors } from './server/lib/collectors';
import { registerTasks, scheduleTasks } from './server/lib/tasks';
import { PLUGIN_ID } from './constants';

export const ossTelemetry = kibana => {
  return new kibana.Plugin({
    id: PLUGIN_ID,
    require: ['elasticsearch', 'xpack_main'],
    configPrefix: 'xpack.oss_telemetry',

    init(server) {
      registerCollectors(server);
      registerTasks(server);
      scheduleTasks(server);
    },
  });
};
