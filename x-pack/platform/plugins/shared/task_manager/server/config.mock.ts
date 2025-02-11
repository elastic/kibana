/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TaskManagerConfig, configSchema } from './config';

const createConfigMock = (overwrites: Partial<TaskManagerConfig> = {}) => {
  const mocked: TaskManagerConfig = configSchema.validate(overwrites);
  return mocked;
};

export const configMock = {
  create: createConfigMock,
};
