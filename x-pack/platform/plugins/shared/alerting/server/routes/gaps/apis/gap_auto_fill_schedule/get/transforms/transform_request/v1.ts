/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetGapAutoFillSchedulerParamsV1 } from '../../../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import type { GetGapAutoFillSchedulerParams } from '../../../../../../../application/gaps/auto_fill_scheduler/methods/types';

export const transformRequest = (
  params: GetGapAutoFillSchedulerParamsV1
): GetGapAutoFillSchedulerParams => ({
  id: params.id,
});
