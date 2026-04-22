/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import { RuleDoctorApi } from '../services/rule_doctor_api';
import { ruleDoctorExecutionKeys } from './query_key_factory';

export const useFetchExecutions = () => {
  const ruleDoctorApi = useService(RuleDoctorApi);

  return useQuery({
    queryKey: ruleDoctorExecutionKeys.lists(),
    queryFn: () => ruleDoctorApi.listExecutions(),
    select: (data) => data.executions,
  });
};
