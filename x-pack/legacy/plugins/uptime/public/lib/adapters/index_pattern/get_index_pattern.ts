/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import { getApiPath } from '../../helper';

export const getIndexPattern = async (basePath?: string) => {
  try {
    const { data } = await axios.get(getApiPath('/api/uptime/index_pattern', basePath));
    return data;
  } catch {
    return undefined;
  }
};
