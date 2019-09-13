/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useCallback } from 'react';

import { npStart } from 'ui/new_platform';
import { SavedObjectsBatchResponse } from 'src/core/public';
import { SavedObjectAttributes } from 'src/core/server';

export const useBulkGetSavedObject = (type: string) => {
  const [data, setData] = useState<SavedObjectsBatchResponse<SavedObjectAttributes> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // INFO: THIS EFFECT JUST BOOTSTRAPS DATA FOR DEMO PURPOSES
  useEffect(() => {
    npStart.core.savedObjects.client.bulkCreate([
      { type, id: 'INFRA:PLACEHOLDER_1', attributes: { viewName: 'Saved View 1' } },
      { type, id: 'INFRA:PLACEHOLDER_2', attributes: { viewName: 'Saved View 2' } },
      { type, id: 'INFRA:PLACEHOLDER_3', attributes: { viewName: 'Saved View 3' } },
    ]);
  }, [false]);

  const bulkGet = useCallback(
    (ids: string[]) => {
      setLoading(true);
      const fetchData = async () => {
        try {
          const d = await npStart.core.savedObjects.client.bulkGet(ids.map(i => ({ type, id: i })));
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
    bulkGet,
  };
};
