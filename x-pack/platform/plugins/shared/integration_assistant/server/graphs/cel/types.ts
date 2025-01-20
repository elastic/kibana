/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CelInputState, ChatModels } from '../../types';

export interface CelInputBaseNodeParams {
  state: CelInputState;
}

export interface CelInputNodeParams extends CelInputBaseNodeParams {
  model: ChatModels;
}

export interface CelInputGraphParams {
  model: ChatModels;
}

export interface CelInputStateDetails {
  configurable: boolean;
  default: string | number | boolean;
  description: string;
  name: string;
  redact: boolean;
  type: string;
}
