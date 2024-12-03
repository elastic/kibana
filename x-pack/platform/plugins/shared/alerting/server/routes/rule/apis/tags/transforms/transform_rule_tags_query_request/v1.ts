/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RewriteRequestCase } from '@kbn/actions-plugin/common';
import type { RuleTagsParams } from '../../../../../../application/rule/methods/tags';

export const transformRuleTagsQueryRequest: RewriteRequestCase<RuleTagsParams> = ({
  per_page: perPage,
  page,
  search,
}) => ({
  page,
  search,
  perPage,
});
