/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@kbn/react-query';

import { API_VERSIONS } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';
import type { SavedQuerySOFormData } from '../../../saved_queries/form/use_saved_query_form';

interface UseSaveQueryFromDetailsProps {
  data: LiveQueryDetailsItem | undefined;
}

export const useSaveQueryFromDetails = ({ data }: UseSaveQueryFromDetailsProps) => {
  const { application, http } = useKibana().services;
  const permissions = application.capabilities.osquery;

  const [showSavedQueryFlyout, setShowSavedQueryFlyout] = useState(false);
  const handleShowSaveQueryFlyout = useCallback(() => setShowSavedQueryFlyout(true), []);
  const handleCloseSaveQueryFlyout = useCallback(() => setShowSavedQueryFlyout(false), []);

  const singleQuery = data?.queries?.[0];
  const savedQueryId = singleQuery?.saved_query_id;
  const canSave = !!permissions.writeSavedQueries && !data?.pack_id && data?.queries?.length === 1;

  // The action document stores the custom "id" field (e.g. "my-query"), not the
  // Kibana saved object UUID. Use the find endpoint with exact id filter.
  const { data: savedQueryData } = useQuery<
    { data: SavedQuerySOFormData[] },
    unknown,
    SavedQuerySOFormData | undefined
  >(
    ['savedQueryEnrichment', savedQueryId],
    () =>
      http.get('/api/osquery/saved_queries', {
        version: API_VERSIONS.public.v1,
        query: { id: savedQueryId, pageSize: 1 },
      }),
    {
      enabled: !!savedQueryId,
      retry: false,
      refetchOnWindowFocus: false,
      select: (response) => response.data?.[0],
    }
  );

  const savedQueryDefaultValue: SavedQuerySOFormData = useMemo(() => {
    const base: SavedQuerySOFormData = {
      query: singleQuery?.query,
      ecs_mapping: singleQuery?.ecs_mapping,
      timeout: singleQuery?.timeout,
    };

    if (savedQueryData) {
      return {
        ...base,
        description: savedQueryData.description,
        platform: savedQueryData.platform,
        version: savedQueryData.version,
        interval: savedQueryData.interval,
      };
    }

    return base;
  }, [singleQuery, savedQueryData]);

  return {
    canSave,
    showSavedQueryFlyout,
    handleShowSaveQueryFlyout,
    handleCloseSaveQueryFlyout,
    savedQueryDefaultValue,
  };
};
