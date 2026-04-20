/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { stackMonitoringCommonSchema } from '../common';

export const nodesChangedParamsSchema = stackMonitoringCommonSchema.extends(
  {},
  {
    meta: {
      title: 'Nodes Changed Rule Params',
      description:
        'The parameters for the nodes changed rule. These parameters are appropriate when `rule_type_id` is `monitoring_alert_nodes_changed`.',
    },
  }
);
export type NodesChangedParams = TypeOf<typeof nodesChangedParamsSchema>;
