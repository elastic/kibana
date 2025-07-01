/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { HttpSetup } from '@kbn/core/public';
import { getScheduledReportsList } from '../apis/get_scheduled_reports_list';
import { queryKeys } from '../query_keys';

export const getKey = queryKeys.getScheduledList;

interface GetScheduledListQueryProps {
  http: HttpSetup;
  index?: number;
  size?: number;
}

export const useGetScheduledList = (props: GetScheduledListQueryProps) => {
  const { index = 1, size = 10 } = props;
  return useQuery({
    queryKey: getKey({ index, size }),
    queryFn: () => getScheduledReportsList(props),
    keepPreviousData: true,
  });
};
