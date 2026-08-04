/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../common/lib/kibana';
import { API_VERSIONS } from '../../../common/constants';
import { useErrorToast } from '../../common/hooks/use_error_toast';

export interface HostCapability {
  agentId: string;
  endpointCapable: boolean;
  endpointId?: string;
}

export const useHostCapability = (agentId: string | undefined) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<HostCapability>(
    ['osquery', 'fileSystem', 'capability', agentId],
    () =>
      http.get<HostCapability>(`/internal/osquery/file_system/capability/${agentId}`, {
        version: API_VERSIONS.internal.v1,
      }),
    {
      enabled: !!agentId,
      retry: false,
      onSuccess: () => setErrorToast(),
      onError: (error) =>
        setErrorToast(error as Error, {
          title: i18n.translate('xpack.osquery.fileSystem.capability.fetchError', {
            defaultMessage: 'Error while checking host capability',
          }),
        }),
    }
  );
};
