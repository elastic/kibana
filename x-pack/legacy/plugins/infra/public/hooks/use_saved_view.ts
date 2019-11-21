/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useFindSavedObject } from './use_find_saved_object';
import { useCreateSavedObject } from './use_create_saved_object';
import { useDeleteSavedObject } from './use_delete_saved_object';

export type SavedView<ViewState> = ViewState & {
  name: string;
  id: string;
  isDefault?: boolean;
};

export type SavedViewSavedObject<ViewState> = ViewState & {
  name: string;
};

export const useSavedView = <ViewState>(defaultViewState: ViewState, viewType: string) => {
  const { data, loading, find, error: errorOnFind } = useFindSavedObject<
    SavedViewSavedObject<ViewState>
  >(viewType);
  const { create, error: errorOnCreate } = useCreateSavedObject(viewType);
  const { deleteObject, deletedId } = useDeleteSavedObject(viewType);
  const deleteView = useCallback((id: string) => deleteObject(id), []);
  const saveView = useCallback((d: { [p: string]: any }) => create(d), []);

  const savedObjects = data ? data.savedObjects : [];
  const views = useMemo(() => {
    const items: Array<SavedView<ViewState>> = [
      {
        name: i18n.translate('xpack.infra.savedView.defaultViewName', {
          defaultMessage: 'Default',
        }),
        id: '0',
        isDefault: true,
        ...defaultViewState,
      },
    ];

    if (data) {
      data.savedObjects.forEach(
        o =>
          o.type === viewType &&
          items.push({
            ...o.attributes,
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
    errorOnFind,
    errorOnCreate,
    deleteView,
    find,
  };
};
