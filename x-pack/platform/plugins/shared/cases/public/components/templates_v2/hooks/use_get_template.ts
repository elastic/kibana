/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useToasts } from '../../../common/lib/kibana';
import * as i18n from '../../templates/translations';
import type { ServerError } from '../../../types';
import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';
import { getTemplate } from '../api/api';
import { casesQueriesKeys } from '../../../containers/constants';

export const useGetTemplate = (templateId?: string): UseQueryResult<ParsedTemplate> => {
  const toasts = useToasts();

  return useQuery(
    casesQueriesKeys.template(templateId ?? ''),
    ({ signal }) => {
      if (!templateId) {
        throw new Error('Template id is required');
      }

      return getTemplate({ templateId, signal });
    },
    {
      enabled: Boolean(templateId),
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
