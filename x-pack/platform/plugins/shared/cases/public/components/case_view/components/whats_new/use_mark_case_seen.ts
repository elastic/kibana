/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { recordCaseView } from '../../../../containers/api';
import { casesQueriesKeys } from '../../../../containers/constants';

export const useMarkCaseSeen = (caseId: string) => {
  const queryClient = useQueryClient();

  return useMutation(() => recordCaseView(caseId, true), {
    onSuccess: () => queryClient.invalidateQueries(casesQueriesKeys.caseDelta(caseId)),
  });
};
