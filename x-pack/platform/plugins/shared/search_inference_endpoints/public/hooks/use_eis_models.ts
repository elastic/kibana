/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { isEisEndpoint } from '../utils/eis_utils';
import { useQueryInferenceEndpoints } from './use_inference_endpoints';

export const useEisModels = () => {
  const { data: allEndpoints, ...rest } = useQueryInferenceEndpoints();

  const data = useMemo(() => allEndpoints?.filter(isEisEndpoint), [allEndpoints]);

  return { data, ...rest };
};
