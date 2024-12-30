/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useToasts } from '../common/lib/kibana';
import { getActionLicense } from './api';
import * as i18n from './translations';
import { ConnectorTypes } from '../../common/types/domain';
import { casesQueriesKeys } from './constants';
import type { ServerError } from '../types';

const MINIMUM_LICENSE_REQUIRED_CONNECTOR = ConnectorTypes.jira;

export const useGetActionLicense = () => {
  const toasts = useToasts();
  return useQuery(
    casesQueriesKeys.license(),
    async ({ signal }) => {
      const response = await getActionLicense(signal);
      return response.find((l) => l.id === MINIMUM_LICENSE_REQUIRED_CONNECTOR) ?? null;
    },
    {
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: i18n.ERROR_TITLE }
          );
        }
      },
    }
  );
};
