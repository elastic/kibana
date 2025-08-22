/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import type { GetGapFillAutoSchedulerParams } from '../../../../../../application/rule/methods/get_gap_fill_auto_scheduler/types';

export const transformRequest = (id: string): GetGapFillAutoSchedulerParams => ({
  id,
});
