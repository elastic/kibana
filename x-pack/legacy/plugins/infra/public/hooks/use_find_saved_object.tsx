/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useCallback } from 'react';

import { npStart } from 'ui/new_platform';
import { SavedObjectsBatchResponse } from 'src/core/public';
import { SavedObjectAttributes } from 'src/core/server';

export const useFindSavedObject = <SavedObjectType extends SavedObjectAttributes>(type: string) => {
  const [data, setData] = useState<SavedObjectsBatchResponse<SavedObjectType> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const find = useCallback(
    (query?: string, searchFields: string[] = []) => {
      setLoading(true);
      const fetchData = async () => {
        try {
          const d = await npStart.core.savedObjects.client.find<SavedObjectType>({
            type,
            search: query,
            searchFields,
          });
          setLoading(false);
          setData(d);
        } catch (e) {
          setLoading(false);
          setError('FAILED_GETTING_SAVED_OBJECTS');
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
    find,
  };
};
