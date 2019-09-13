/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useCallback } from 'react';
import { SavedObjectAttributes } from 'src/core/public';
import { useBulkGetSavedObject } from '../../hooks/use_bulk_get_saved_object';
import { useCreateSavedObject } from '../../hooks/use_create_saved_object';

export const useSavedViews = () => {
  const { data, loading, error, bulkGet } = useBulkGetSavedObject('config'); // TODO: Figure out the proper space in SavedObjects for this

  const { create } = useCreateSavedObject('config');

  const createView = useCallback((view: SavedObjectAttributes) => {
    create(view);
  }, []);
  const getViews = useCallback((ids: string[]) => bulkGet(ids), []);

  return {
    loading,
    getViews,
    views: data ? data.savedObjects.map(o => ({ name: o.attributes.viewName as string })) : [],
    error,
    createView,
  };
};
