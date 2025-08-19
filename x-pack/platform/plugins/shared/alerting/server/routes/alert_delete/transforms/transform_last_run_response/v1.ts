/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertDeleteLastRun } from '@kbn/alerting-types';
import type { AlertDeleteLastRunResponseV1 } from '../../../../../common/routes/alert_delete';

export const transformAlertDeleteLastRunToResponse = ({
  lastRun,
}: AlertDeleteLastRun): AlertDeleteLastRunResponseV1 => {
  return {
    last_run: lastRun,
  };
};
