/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { updateEsqlRuleDataSchema } from '../schemas';

type UpdateEsqlRuleDataType = TypeOf<typeof updateEsqlRuleDataSchema>;

export interface UpdateEsqlRuleData {
  name?: UpdateEsqlRuleDataType['name'];
  tags?: UpdateEsqlRuleDataType['tags'];
  schedule?: UpdateEsqlRuleDataType['schedule'];
  enabled?: UpdateEsqlRuleDataType['enabled'];
  esql?: UpdateEsqlRuleDataType['esql'];
  timeField?: UpdateEsqlRuleDataType['timeField'];
  lookbackWindow?: UpdateEsqlRuleDataType['lookbackWindow'];
  groupKey?: UpdateEsqlRuleDataType['groupKey'];
}
