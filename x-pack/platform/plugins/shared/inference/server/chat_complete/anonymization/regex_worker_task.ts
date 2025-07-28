/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationRegexWorkerTaskPayload } from '@kbn/inference-common';
import { executeRegexRuleTask } from './execute_regex_rule_task';

// eslint-disable-next-line import/no-default-export
export default function ({ rule, records }: AnonymizationRegexWorkerTaskPayload) {
  return executeRegexRuleTask({ rule, records });
}
