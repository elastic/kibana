/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleHealthFormattedResult } from '../../../../../application/rule/methods/aggregate/types';
import type { RuleHealthResponseBodyV1 } from '../../../../../../common/routes/rule/apis/health';

export const transformRuleHealthBodyResponse = ({
  total,
  byOutcome,
  byStatus,
  byErrorReason,
  byWarningReason,
  topErrorMessages,
  apiKeyError,
  missingApiKey,
}: RuleHealthFormattedResult): RuleHealthResponseBodyV1 => ({
  total,
  by_outcome: byOutcome,
  by_status: byStatus,
  by_error_reason: byErrorReason,
  by_warning_reason: byWarningReason,
  top_error_messages: topErrorMessages,
  api_key_error: apiKeyError,
  missing_api_key: missingApiKey,
});
