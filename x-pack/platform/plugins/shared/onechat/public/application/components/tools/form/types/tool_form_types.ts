/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlToolFieldTypes, ToolType } from '@kbn/onechat-common';

export interface EsqlParam {
  name: string;
  type: EsqlToolFieldTypes;
  description: string;
}

type EsqlParamFormData = EsqlParam & {
  warning?: string;
};

export interface ToolFormData {
  type: ToolType;
  toolId: string;
  description: string;
  labels: string[];
}

export interface EsqlToolFormData extends ToolFormData {
  esql: string;
  params: EsqlParamFormData[];
}
