/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useCallback } from 'react';

import { npStart } from 'ui/new_platform';
import { SavedObjectsBatchResponse } from 'src/core/public';
import { SavedObjectAttributes } from 'src/core/server';

export const useBulkGetSavedObject = (type: string) => {
  const [data, setData] = useState<SavedObjectsBatchResponse<SavedObjectAttributes> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const bulkGet = useCallback(
    (ids: string[]) => {
      setLoading(true);
      const fetchData = async () => {
        try {
          const d = await npStart.core.savedObjects.client.bulkGet(ids.map(i => ({ type, id: i })));
          setError(null);
          setLoading(false);
          setData(d);
        } catch (e) {
          setLoading(false);
          setError(e);
        }
      };
      fetchData();
    },
    [type]
  );

  return {
    data,
    loading,
    error,
    bulkGet,
  };
};
