/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeParams } from '@kbn/alerting-plugin/common';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';

export interface ESQLRuleParams extends RuleTypeParams {
  timeWindowSize: number;
  timeWindowUnit: string;
  esqlQuery: AggregateQuery;
  timeField: string;
  parentId: string;
}

export interface ESQLRuleMetaData {
  adHocDataViewList: DataView[];
  isManagementPage?: boolean;
  isEdit?: boolean;
}

export type DataViewOption = EuiComboBoxOptionOption<string>;
