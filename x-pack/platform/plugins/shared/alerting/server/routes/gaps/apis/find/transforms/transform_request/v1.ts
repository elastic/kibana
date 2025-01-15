/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import { FindGapsRequestBodyV1 } from '../../../../../../../common/routes/gaps/apis/find';
import { FindGapsParams } from '../../../../../../lib/rule_gaps/types';

export const transformRequest = ({
  page,
  per_page,
  rule_id,
  start,
  end,
  sort_field,
  sort_order,
  statuses,
}: FindGapsRequestBodyV1): FindGapsParams => ({
  ruleId: rule_id,
  end,
  page,
  perPage: per_page,
  statuses,
  start,
  sortField: sort_field,
  sortOrder: sort_order,
});
