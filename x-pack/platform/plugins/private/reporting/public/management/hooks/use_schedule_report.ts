/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { useMutation } from '@tanstack/react-query';
import { mutationKeys } from '../mutation_keys';
import { scheduleReport, ScheduleReportRequestParams } from '../apis/schedule_report';

export const getKey = mutationKeys.scheduleReport;

export const useScheduleReport = ({ http }: { http: HttpSetup }) => {
  return useMutation({
    mutationKey: getKey(),
    mutationFn: (params: ScheduleReportRequestParams) => scheduleReport({ http, params }),
  });
};
