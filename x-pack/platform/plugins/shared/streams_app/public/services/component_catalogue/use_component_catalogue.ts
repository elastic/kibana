/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useRef } from 'react';
import { useAbortableAsync } from '@kbn/react-hooks';
import type { ComponentCatalogue } from '@kbn/streams-schema';
import { useKibana } from '../../hooks/use_kibana';
import { toEditableCatalogue } from './catalogue_compatibility';

export interface ComponentCatalogueState {
  /** The catalogue as served, for listing what a unit holds even when nothing in it can be edited. */
  catalogue?: ComponentCatalogue;
  /** The catalogue narrowed to what this Kibana can edit; absent while loading or when unsupported. */
  editableCatalogue?: ComponentCatalogue;
  /** The served catalogue's schema version, set only when this Kibana cannot edit from it. */
  unsupportedVersion?: string;
  /** The catalogue may be out of date: Kibana could not reach the distributor, or this refetch failed. */
  stale: boolean;
  loading: boolean;
  error?: Error;
  /** Fetches again, past the browser's copy. */
  refresh: () => void;
}

/**
 * The component catalogue, fetched on every mount and gated to what this Kibana supports. The
 * last catalogue of the app session is shown while the fetch runs, and kept if it fails.
 */
export const useComponentCatalogue = (): ComponentCatalogueState => {
  const {
    services: { componentCatalogue: client },
  } = useKibana();
  const forceRefresh = useRef(false);
  const {
    value,
    loading,
    error,
    refresh: rerun,
  } = useAbortableAsync(() => {
    const force = forceRefresh.current;
    forceRefresh.current = false;
    return client.getCatalogue({ forceRefresh: force });
  }, [client]);
  const fetched = value ?? client.getLastCatalogue();
  const catalogue = fetched?.catalogue;
  const editableCatalogue = useMemo(
    () => (catalogue ? toEditableCatalogue(catalogue) : undefined),
    [catalogue]
  );
  return {
    catalogue,
    editableCatalogue,
    unsupportedVersion: catalogue && !editableCatalogue ? catalogue.schema_version : undefined,
    stale: fetched !== undefined && (fetched.stale || (!loading && error !== undefined)),
    loading,
    error,
    refresh: () => {
      forceRefresh.current = true;
      rerun();
    },
  };
};
