/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import {
  CASES_API_ERROR_CODES,
  isCasesApiErrorAttributes,
} from '../../../common/constants/error_codes';
import type {
  MergeCasesResolveRequest,
  MergeCasesResolveResponse,
} from '../../../common/types/api';
import { useToasts } from '../../common/lib/kibana';
import { useCasesToast } from '../../common/use_cases_toast';
import { resolveMergeConflicts } from '../../containers/api';
import { casesMutationsKeys } from '../../containers/constants';
import type { ServerError } from '../../types';
import * as i18n from './translations';

const isNoAiConnectorError = (error: ServerError | null | undefined): boolean => {
  const attributes = error?.body?.attributes;
  return (
    isCasesApiErrorAttributes(attributes) &&
    attributes.code === CASES_API_ERROR_CODES.MERGE_RESOLVE_NO_AI_CONNECTOR
  );
};

/** Asks the AI for a value for every field the cases disagree on. */
export const useResolveMergeConflicts = () => {
  const toasts = useToasts();
  const { showErrorToast } = useCasesToast();

  return useMutation<MergeCasesResolveResponse, ServerError, MergeCasesResolveRequest>(
    (request) => resolveMergeConflicts({ request }),
    {
      mutationKey: casesMutationsKeys.resolveMergeConflicts,
      onError: (error) => {
        if (isNoAiConnectorError(error)) {
          toasts.addWarning({ title: i18n.AI_NO_CONNECTOR_TITLE, text: i18n.AI_NO_CONNECTOR_BODY });
          return;
        }
        showErrorToast(error, { title: i18n.AI_RESOLVE_FAILED_TITLE });
      },
    }
  );
};
