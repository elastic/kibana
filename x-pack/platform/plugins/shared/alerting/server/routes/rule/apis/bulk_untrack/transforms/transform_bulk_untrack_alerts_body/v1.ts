/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkUntrackRequestBodyV1 } from '../../../../../../../common/routes/rule/apis/bulk_untrack';

export const transformBulkUntrackAlertsBody = ({
  indices,
  alert_uuids: alertUuids,
}: BulkUntrackRequestBodyV1) => ({
  indices,
  alertUuids,
});
