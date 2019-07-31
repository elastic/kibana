/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';
import { InfraNodeType } from '../../graphql/types';
import { InfraMetricLayout } from '../../pages/metrics/layouts/types';
import { Metadata } from '../../../server/routes/metadata/types';
import { fetch } from '../../utils/fetch';
import { getFilteredLayouts } from './lib/get_filtered_layouts';

export function useMetadata(
  nodeId: string,
  nodeType: InfraNodeType,
  layouts: InfraMetricLayout[],
  sourceId: string
) {
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<Metadata | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const response = await fetch.post<Metadata>('../api/infra/metadata', {
          nodeId,
          nodeType,
          sourceId,
        });
        setData(response.data);
      } catch (e) {
        setError(e);
      }
      setLoading(false);
    })();
  }, [nodeId, nodeType, sourceId]);
  return {
    name: (data && data.name) || '',
    filteredLayouts: (data && getFilteredLayouts(layouts, data.features)) || [],
    error: (error && error.message) || null,
    loading,
  };
}
