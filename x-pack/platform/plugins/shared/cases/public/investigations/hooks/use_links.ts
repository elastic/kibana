/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { linkRecord, unlinkRecord } from '../api/client';
import { investigationKeys } from '../api/query_keys';
import { useInvestigationsServices } from '../services';
import { useInvestigationToasts } from './use_investigation_toasts';
import * as i18n from './translations';

/** Links this investigation to another one. The link is stored on both records. */
export const useLinkRecord = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useInvestigationToasts();

  return useMutation((otherId: string) => linkRecord(http, recordId, otherId), {
    onSuccess: ({ other }) => {
      showSuccess(i18n.LINK_RECORD_SUCCESS(other.display_id));
      void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
      void queryClient.invalidateQueries(investigationKeys.recordScope(other.id));
    },
    onError: (error) => showError(error, i18n.LINK_RECORD_ERROR),
  });
};

/** Removes the link from both records. */
export const useUnlinkRecord = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useInvestigationToasts();

  return useMutation((otherId: string) => unlinkRecord(http, recordId, otherId), {
    onSuccess: ({ other }) => {
      showSuccess(i18n.UNLINK_RECORD_SUCCESS(other.display_id));
      void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
      void queryClient.invalidateQueries(investigationKeys.recordScope(other.id));
    },
    onError: (error) => showError(error, i18n.UNLINK_RECORD_ERROR),
  });
};
