/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import { getApiPath } from '../../helper';

/**
 * Fetches and returns the uptime index pattern, optionally provides it to
 * a given setter function.
 * @param basePath - the base path, if any
 * @param setter - a callback for use with non-async functions like `useEffect`
 */
export const getDynamicSettings = async (basePath?: string, setter?: (data: unknown) => void) => {
  try {
    const { data } = await axios.get(getApiPath('/api/uptime/dynamic_settings', basePath));
    if (setter) {
      setter(data);
    }
    return data;
  } catch {
    return undefined;
  }
};
