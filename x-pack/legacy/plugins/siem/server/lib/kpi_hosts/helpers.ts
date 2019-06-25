/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestKpiHostDetailsOptions } from './types';
import { RequestBasicOptions } from '../framework';

export const isKpiHostDetailsOptions = (
  options: RequestBasicOptions | RequestKpiHostDetailsOptions
): options is RequestKpiHostDetailsOptions => {
  return (options as RequestKpiHostDetailsOptions).hostName !== undefined;
};
