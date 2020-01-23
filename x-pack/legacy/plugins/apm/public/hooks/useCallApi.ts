/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { callApi, FetchOptions } from '../services/rest/callApi';
import { useApmPluginContext } from './useApmPluginContext';

export function useCallApi() {
  const { http } = useApmPluginContext().core;

  return useMemo(() => {
    return <T = void>(options: FetchOptions) => callApi<T>(http, options);
  }, [http]);
}
