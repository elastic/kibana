/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAbortableAsync } from '@kbn/react-hooks';
import type { ComponentCatalogue } from '@kbn/streams-schema';
import { createSnapshotComponentCatalogueClient } from './snapshot_client';
import type { ComponentCatalogueClient } from './types';

export interface ComponentCatalogueState {
  catalogue?: ComponentCatalogue;
  loading: boolean;
  error?: Error;
  refresh: () => void;
}

export const createComponentCatalogueClient = (): ComponentCatalogueClient =>
  createSnapshotComponentCatalogueClient();

export const useComponentCatalogue = (): ComponentCatalogueState => {
  const client = useMemo(() => createComponentCatalogueClient(), []);
  const { value, loading, error, refresh } = useAbortableAsync(
    ({ signal }) => client.getCatalogue({ signal }),
    [client]
  );
  return { catalogue: value, loading, error, refresh };
};
