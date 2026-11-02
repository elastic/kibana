/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory, useParams } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { NotebookEditor } from '../components/notebook_editor';
import { createEmptyNotebook } from '../model/cell_factory';
import type { NotebookStore } from '../model/notebook_store';
import { useNotebookServices } from '../services';
import type { NotebookApi } from '../services/notebook_api';
import { useBreadcrumbs } from './use_breadcrumbs';

const UNTITLED = i18n.translate('xpack.notebook.untitled', { defaultMessage: 'Untitled notebook' });

export const NewNotebookPage = ({ api }: { api: NotebookApi }) => {
  const { core } = useNotebookServices();
  const history = useHistory();
  useBreadcrumbs(UNTITLED);

  const save = async (store: NotebookStore) => {
    const { id } = await api.create(store.toAttributes());
    store.markSaved();
    core.notifications.toasts.addSuccess(
      i18n.translate('xpack.notebook.saved', { defaultMessage: 'Notebook saved' })
    );
    history.replace(`/view/${id}`);
  };

  return <NotebookEditor attributes={createEmptyNotebook(UNTITLED)} onSave={save} />;
};

export const EditNotebookPage = ({ api }: { api: NotebookApi }) => {
  const { core } = useNotebookServices();
  const { id } = useParams<{ id: string }>();
  const { loading, value, error } = useAsync(() => api.get(id), [api, id]);
  useBreadcrumbs(value?.attributes.title);

  if (loading) return <EuiLoadingSpinner size="xl" />;
  if (error || !value) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        title={
          <h2>
            {i18n.translate('xpack.notebook.loadError', {
              defaultMessage: 'Could not load notebook',
            })}
          </h2>
        }
        body={error?.message}
      />
    );
  }

  const save = async (store: NotebookStore) => {
    await api.update(id, store.toAttributes());
    store.markSaved();
    core.notifications.toasts.addSuccess(
      i18n.translate('xpack.notebook.saved', { defaultMessage: 'Notebook saved' })
    );
  };

  return <NotebookEditor key={id} attributes={value.attributes} onSave={save} />;
};
