/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertDeletionPreview } from '@kbn/alerting-types';
import type { AlertDeletionPreviewResponseV1 } from '../../../../../common/routes/rule/apis/alert_deletion';

export const transformAlertDeletionPreviewToResponse = ({
  affectedAlertCount,
}: AlertDeletionPreview): AlertDeletionPreviewResponseV1 => {
  return {
    body: {
      affected_alert_count: affectedAlertCount,
    },
  };
};
