/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnmuteAlertParams } from '../../../../../../application/rule/methods/unmute_alert/types';
import type { RewriteRequestCase } from '../../../../../lib';
import type { UnmuteAlertRequestParamsV1 } from '../../../../../../../common/routes/rule/apis/unmute_alert';

export const transformRequestParamsToApplication: RewriteRequestCase<UnmuteAlertParams> = ({
  rule_id: alertId,
  alert_id: alertInstanceId,
}: UnmuteAlertRequestParamsV1) => ({
  alertId,
  alertInstanceId,
});
