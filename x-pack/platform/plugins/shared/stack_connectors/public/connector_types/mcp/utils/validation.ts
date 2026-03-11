/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { mcpParamsErrorStrings } from '../translations';

export const validateSubActionParamsJson = (params: string | undefined): string[] => {
  if (isEmpty(params)) {
    return [mcpParamsErrorStrings.required];
  }
  try {
    JSON.parse(params!); // isEmpty checks params is defined
    return [];
  } catch (error) {
    return [mcpParamsErrorStrings.invalidJson];
  }
};
