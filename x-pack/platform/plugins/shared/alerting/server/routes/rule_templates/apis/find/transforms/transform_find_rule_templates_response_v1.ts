/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRuleTemplatesResponseV1 } from '../../../../../../common/routes/rule_template/apis/find';
import type { FindResult } from '../../../../../application/rule_template/methods/find/find_rule_templates';
import { transformGetResponse } from '../../get/transforms/transform_to_get_response';

export const transformFindRuleTemplatesResponseV1 = (
  result: FindResult
): FindRuleTemplatesResponseV1 => ({
  page: result.page,
  per_page: result.perPage,
  total: result.total,
  data: result.data.map(transformGetResponse),
});
