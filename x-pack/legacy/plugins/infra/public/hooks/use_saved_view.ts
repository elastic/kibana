/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo } from 'react';
import { SavedObjectAttributes } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { useFindSavedObject } from './use_find_saved_object';
import { useCreateSavedObject } from './use_create_saved_object';
import { useDeleteSavedObject } from './use_delete_saved_object';

interface SavedView {
  name: string;
  id: string;
  isDefault?: boolean;
  [p: string]: any;
}

export interface SavedViewSavedObject extends SavedObjectAttributes {
  type: string;
  data: {
    name: string;
    [p: string]: any;
  };
}

export const useSavedView = <ViewState>(defaultViewState: ViewState, viewType: string) => {
  const { data, loading, find, error } = useFindSavedObject<SavedViewSavedObject>('config');
  const { create } = useCreateSavedObject('config');
  const { deleteObject, deletedId } = useDeleteSavedObject('config');
  const deleteView = useCallback((id: string) => deleteObject(id), []);
  const saveView = useCallback(
    (d: { [p: string]: any }) => create({ type: viewType, data: d }),
    []
  );

  const savedObjects = data ? data.savedObjects : [];
  const views = useMemo(() => {
    const items: SavedView[] = [
      {
        name: i18n.translate('xpack.infra.savedView.defaultViewName', {
          defaultMessage: 'Default View',
        }),
        id: '0',
        isDefault: true,
        ...defaultViewState,
      },
    ];

    if (data) {
      data.savedObjects.forEach(
        o =>
          o.attributes.type === viewType &&
          items.push({
            ...o.attributes.data,
            name: o.attributes.data.name,
            id: o.id,
          })
      );
    }

    return items;
  }, [savedObjects, defaultViewState]);

  return {
    views,
    saveView,
    loading,
    deletedId,
    error,
    deleteView,
    find,
  };
};
