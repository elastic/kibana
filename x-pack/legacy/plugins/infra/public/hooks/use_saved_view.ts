/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useFindSavedObject } from './use_find_saved_object';
import { useCreateSavedObject } from './use_create_saved_object';
import { useDeleteSavedObject } from './use_delete_saved_object';

export type SavedView<ViewState> = ViewState & {
  name: string;
  id: string;
  isDefault?: boolean;
};

export type SavedViewSavedObject<ViewState = {}> = ViewState & {
  name: string;
};

export const useSavedView = <ViewState>(defaultViewState: ViewState, viewType: string) => {
  const { data, loading, find, error: errorOnFind, hasView } = useFindSavedObject<
    SavedViewSavedObject<ViewState>
  >(viewType);
  const { create, error: errorOnCreate, createdId } = useCreateSavedObject(viewType);
  const { deleteObject, deletedId } = useDeleteSavedObject(viewType);
  const deleteView = useCallback((id: string) => deleteObject(id), []);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => setCreateError(createError), [errorOnCreate, setCreateError]);

  const saveView = useCallback((d: { [p: string]: any }) => {
    const doSave = async () => {
      const exists = await hasView(d.name);
      if (exists) {
        setCreateError(
          i18n.translate('xpack.infra.savedView.errorOnCreate.duplicateViewName', {
            defaultMessage: `A view with that name already exists.`,
          })
        );
        return;
      }
      create(d);
    };
    setCreateError(null);
    doSave();
  }, []);

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
    createdId,
    errorOnFind,
    errorOnCreate: createError,
    deleteView,
    find,
  };
};
