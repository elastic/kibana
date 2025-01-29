/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesConfigurationUI } from '../types';
import { initialConfiguration } from './utils';
import { useGetCaseConfigurationsQuery } from './use_get_case_configurations_query';

const transformConfiguration = (data: CasesConfigurationUI[] | null): CasesConfigurationUI[] => {
  if (data) {
    return data;
  }

  return [initialConfiguration];
};

export const useGetAllCaseConfigurations = () =>
  useGetCaseConfigurationsQuery<CasesConfigurationUI[]>({ select: transformConfiguration });

export type UseGetAllCaseConfigurations = ReturnType<typeof useGetAllCaseConfigurations>;
