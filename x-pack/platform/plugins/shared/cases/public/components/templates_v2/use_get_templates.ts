/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useToasts } from '../../common/lib/kibana';
import * as i18n from '../templates/translations';
import type { ServerError } from '../../types';
import type { TemplatesFindResponse } from './types';
import { getTemplates } from './api';

export const templatesQueryKeys = {
  all: ['templates'] as const,
  list: () => [...templatesQueryKeys.all, 'list'] as const,
  templates: (params: unknown) => [...templatesQueryKeys.list(), params] as const,
};

export const useGetTemplates = (
  params: { page?: number; perPage?: number } = {}
): UseQueryResult<TemplatesFindResponse> => {
  const toasts = useToasts();

  return useQuery(
    templatesQueryKeys.templates(params),
    ({ signal }) => {
      return getTemplates({
        signal,
        page: params.page,
        perPage: params.perPage,
      });
    },
    {
      keepPreviousData: true,
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: i18n.ERROR_FETCHING_TEMPLATES }
          );
        }
      },
    }
  );
};
