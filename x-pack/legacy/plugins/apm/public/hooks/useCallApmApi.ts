/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { createCallApmApi } from '../services/rest/createCallApmApi';
import { useApmPluginContext } from './useApmPluginContext';

export function useCallApmApi() {
  const { http } = useApmPluginContext().core;

  return useMemo(() => {
    return createCallApmApi(http);
  }, [http]);
}
