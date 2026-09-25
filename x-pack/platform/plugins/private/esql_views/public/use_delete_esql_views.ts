/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { IToasts } from '@kbn/core/public';
import type { EsqlView } from '@kbn/esql-types';
import type { EsqlViewsClient } from '@kbn/esql-utils';
import { translations } from './translations';

interface UseDeleteEsqlViewsOptions {
  client: EsqlViewsClient;
  toasts: IToasts;
  /** Called after every delete attempt, whether it succeeded or failed. */
  onDeleted: () => void;
}

export interface UseDeleteEsqlViewsResult {
  viewsPendingDelete: EsqlView[];
  isDeleting: boolean;
  requestDelete: (views: EsqlView[]) => void;
  cancelDelete: () => void;
  confirmDelete: () => Promise<void>;
}

export const useDeleteEsqlViews = ({
  client,
  toasts,
  onDeleted,
}: UseDeleteEsqlViewsOptions): UseDeleteEsqlViewsResult => {
  const isMounted = useRef(true);
  const [viewsPendingDelete, setViewsPendingDelete] = useState<EsqlView[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const requestDelete = useCallback((views: EsqlView[]) => {
    setViewsPendingDelete(views);
  }, []);

  const cancelDelete = useCallback(() => {
    if (!isDeleting) {
      setViewsPendingDelete([]);
    }
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (viewsPendingDelete.length === 0 || isDeleting) {
      return;
    }

    const names = viewsPendingDelete.map(({ name }) => name);
    setIsDeleting(true);

    try {
      await client.deleteViews(names);
      toasts.addSuccess(translations.deleteSuccess(names.length, names[0]));
    } catch (error) {
      toasts.addDanger({
        title: translations.deleteError(names.length, names[0]),
        text: error instanceof Error ? error.message : String(error),
      });
    }

    if (!isMounted.current) {
      return;
    }

    setIsDeleting(false);
    setViewsPendingDelete([]);
    // Refresh after failures too: the list may have changed on the server.
    onDeleted();
  }, [client, isDeleting, onDeleted, toasts, viewsPendingDelete]);

  return {
    viewsPendingDelete,
    isDeleting,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
};
