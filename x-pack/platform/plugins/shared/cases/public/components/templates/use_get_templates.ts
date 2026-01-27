/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useToasts } from '../../common/lib/kibana';
import type { ServerError } from '../../types';
import { MOCK_TEMPLATES } from './sample_data';
import type { Template } from './sample_data';
import * as i18n from './translations';
// TODO: Uncomment when API is available
// import { KibanaServices } from '../../common/lib/kibana';
// import { CASES_URL } from '../../../common/constants';
// const TEMPLATES_URL = `${CASES_URL}/templates` as const;

export interface TemplatesFindResponse {
  templates: Template[];
  page: number;
  perPage: number;
  total: number;
}

export const templatesQueryKeys = {
  all: ['templates'] as const,
  list: () => [...templatesQueryKeys.all, 'list'] as const,
  templates: (params: unknown) => [...templatesQueryKeys.list(), params] as const,
};

const getTemplates = async ({
  page = 1,
  perPage = 10,
}: {
  signal?: AbortSignal;
  page?: number;
  perPage?: number;
}): Promise<TemplatesFindResponse> => {
  // TODO: Replace with actual API call when available
  // const response = await KibanaServices.get().http.fetch<TemplatesFindResponse>(TEMPLATES_URL, {
  //   method: 'GET',
  //   query: { page, perPage },
  //   signal,
  // });
  // return response;

  // Return mock data
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginatedTemplates = MOCK_TEMPLATES.slice(start, end);

  return {
    templates: paginatedTemplates,
    page,
    perPage,
    total: MOCK_TEMPLATES.length,
  };
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
