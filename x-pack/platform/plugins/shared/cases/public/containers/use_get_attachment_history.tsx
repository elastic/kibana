/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { getAttachmentHistory } from './api';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { ERROR_TITLE } from './translations';
import { casesQueriesKeys } from './constants';

export const useGetAttachmentHistory = ({
  caseId,
  attachmentId,
  isEnabled,
}: {
  caseId: string;
  attachmentId: string;
  isEnabled: boolean;
}) => {
  const { showErrorToast } = useCasesToast();

  return useQuery(
    casesQueriesKeys.attachmentHistory(caseId, attachmentId),
    ({ signal }) => getAttachmentHistory(caseId, attachmentId, signal),
    {
      enabled: isEnabled,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: ERROR_TITLE });
      },
    }
  );
};
