/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeParams } from '@kbn/alerting-plugin/common';

export interface DatasetQualityRuleParams extends RuleTypeParams {
  name: string;
  groupBy?: string | string[];
}

export interface AlertContextMetadata {
  adHocDataViewList: DataView[];
}
