/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface OnechatSetupDependencies {}

export interface OnechatStartDependencies {}

export interface OnechatPluginSetup {}

export interface OnechatPluginStart {}

export interface OnechatEsqlParam {
  name: string;
  type: ES_FIELD_TYPES;
  description: string;
}

export interface OnechatCreateEsqlToolFormData {
  name: string;
  description: string;
  esql: string;
  tags: string[];
  params: OnechatEsqlParam[];
}
