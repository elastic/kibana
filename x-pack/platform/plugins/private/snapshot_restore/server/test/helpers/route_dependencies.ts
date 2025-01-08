/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { License } from '../../services';
import { handleEsError } from '../../shared_imports';
import { wrapEsError } from '../../lib';
import type { RouteDependencies } from '../../types';

const license = new License();
license.getStatus = jest.fn().mockReturnValue({ isValid: true });

export const routeDependencies: Omit<RouteDependencies, 'router'> = {
  license,
  config: {
    isSecurityEnabled: jest.fn().mockReturnValue(true),
    isCloudEnabled: false,
    isSlmEnabled: true,
  },
  lib: {
    wrapEsError,
    handleEsError,
  },
};
