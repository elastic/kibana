/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { INVESTIGATION_TYPE_TEMPLATE_TAG } from '../../../common/investigations/template_fields';
import { useGetTemplates } from '../../components/templates_v2/hooks/use_get_templates';
import { investigationKeys } from '../api/query_keys';

const MAX_TEMPLATES = 100;

/**
 * Every investigation template, enabled or not: the Cases templates of the investigations owner
 * that carry the `investigation-type` tag. Only the latest version of each template is listed.
 */
export const useInvestigationTemplates = () =>
  useGetTemplates({
    queryParams: {
      page: 1,
      perPage: MAX_TEMPLATES,
      owner: [SECURITY_SOLUTION_OWNER],
      tags: [INVESTIGATION_TYPE_TEMPLATE_TAG],
      sortField: 'name',
      sortOrder: 'asc',
      search: '',
      author: [],
    },
  });

/**
 * Refreshes what the app derives from templates (the template pickers and the task lists) after
 * a template is created, edited, enabled or disabled.
 */
export const useRefreshInvestigationTemplates = (): (() => Promise<void>) => {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries(investigationKeys.types()),
      queryClient.invalidateQueries(investigationKeys.procedureTemplates()),
    ]);
  }, [queryClient]);
};
