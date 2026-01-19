/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertDeletePreview } from '@kbn/alerting-types';
import type { AlertDeletePreviewResponseV1 } from '../../../../../common/routes/alert_delete';

export const transformAlertDeletePreviewToResponse = ({
  affectedAlertCount,
}: AlertDeletePreview): AlertDeletePreviewResponseV1 => {
  return {
    affected_alert_count: affectedAlertCount,
  };
};
