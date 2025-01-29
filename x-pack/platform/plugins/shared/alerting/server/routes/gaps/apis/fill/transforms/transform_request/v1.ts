/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import { FillGapByIdQueryV1 } from '../../../../../../../common/routes/gaps/apis/fill';
import { FillGapByIdParams } from '../../../../../../application/rule/methods/fill_gap_by_id/types';

export const transformRequest = ({ rule_id, gap_id }: FillGapByIdQueryV1): FillGapByIdParams => ({
  gapId: gap_id,
  ruleId: rule_id,
});
