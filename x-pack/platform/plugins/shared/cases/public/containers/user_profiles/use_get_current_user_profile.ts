/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { UserProfile } from '@kbn/security-plugin/common';
import * as i18n from '../translations';
import { useKibana, useToasts } from '../../common/lib/kibana';
import type { ServerError } from '../../types';
import { casesQueriesKeys } from '../constants';
import { getCurrentUserProfile } from './api';

export const useGetCurrentUserProfile = () => {
  const { security } = useKibana().services;

  const toasts = useToasts();

  return useQuery<UserProfile, ServerError>(
    casesQueriesKeys.currentUser(),
    () => {
      return getCurrentUserProfile({ security });
    },
    {
      retry: false,
      onError: (error: ServerError) => {
        // Anonymous users (users authenticated via a proxy or configured in the kibana config) will result in a 404
        // from the security plugin. If this happens we'll silence the error and operate without the current user profile
        if (error.name !== 'AbortError' && error.body?.statusCode !== 404) {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.ERROR_TITLE,
            }
          );
        }
      },
    }
  );
};

export type UseGetCurrentUserProfile = UseQueryResult<UserProfile, ServerError>;
