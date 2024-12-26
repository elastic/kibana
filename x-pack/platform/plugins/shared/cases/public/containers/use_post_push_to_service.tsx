/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';

import type { CaseConnector } from '../../common/types/domain';
import { pushCase } from './api';
import * as i18n from './translations';
import { useCasesToast } from '../common/use_cases_toast';
import { casesMutationsKeys } from './constants';
import type { ServerError } from '../types';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';

interface PushToServiceRequest {
  caseId: string;
  connector: CaseConnector;
}

export const usePostPushToService = () => {
  const { showErrorToast, showSuccessToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  return useMutation(
    (request: PushToServiceRequest) =>
      pushCase({ caseId: request.caseId, connectorId: request.connector.id }),
    {
      mutationKey: casesMutationsKeys.pushCase,
      onSuccess: (_, { connector }) => {
        showSuccessToast(i18n.SUCCESS_SEND_TO_EXTERNAL_SERVICE(connector.name));
        refreshCaseViewPage();
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export type UsePostPushToService = ReturnType<typeof usePostPushToService>;
