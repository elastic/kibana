/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../hooks/use_kibana';
import type { GetCortexPageResponse, ListCortexPagesResponse } from './types';

const CORTEX_PAGES_PATH = '/internal/nightshift/cortex/pages';

const cortexKeys = {
  pages: ['cortex', 'pages'] as const,
  page: (id: string) => ['cortex', 'page', id] as const,
};

export const useCortexPages = () => {
  const { core } = useKibana();

  return useQuery({
    queryKey: cortexKeys.pages,
    queryFn: ({ signal }) => core.http.get<ListCortexPagesResponse>(CORTEX_PAGES_PATH, { signal }),
  });
};

export const useCortexPage = (id: string | undefined) => {
  const { core } = useKibana();

  return useQuery({
    queryKey: cortexKeys.page(id ?? ''),
    queryFn: ({ signal }) =>
      core.http.get<GetCortexPageResponse>(`${CORTEX_PAGES_PATH}/${id}`, { signal }),
    enabled: id !== undefined,
  });
};
