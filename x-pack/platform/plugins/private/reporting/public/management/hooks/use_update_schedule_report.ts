/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { mutationKeys } from '../mutation_keys';
import type { UpdateScheduleReportRequestParams } from '../apis/update_schedule_report';
import { updateScheduleReport } from '../apis/update_schedule_report';
import { root } from '../query_keys';

export const getKey = mutationKeys.updateScheduleReport;

export const useUpdateScheduleReport = ({ http }: { http: HttpSetup }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getKey(),
    mutationFn: (params: UpdateScheduleReportRequestParams) =>
      updateScheduleReport({ http, params }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [root, 'scheduledList'],
        refetchType: 'active',
      });
    },
  });
};
