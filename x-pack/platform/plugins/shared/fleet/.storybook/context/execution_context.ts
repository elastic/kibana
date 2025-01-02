/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ExecutionContextSetup } from '@kbn/core/public';
import { of } from 'rxjs';

export const getExecutionContext = () => {
  const exec: ExecutionContextSetup = {
    context$: of({}),
    get: () => {
      return {};
    },
    clear: () => {},
    set: (context: Record<string, any>) => {},
    getAsLabels: () => {
      return {};
    },
    withGlobalContext: () => {
      return {};
    },
  };

  return exec;
};
