/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useKibana } from '../../../hooks/use_kibana';
import { collectFieldValues } from './entity_kql';
import type { Entity } from './fake_entities';

/**
 * Teaches the unified search bar's autocomplete to suggest *values* for the
 * ElasticOn Inventory fields (e.g. typing `application:` offers the seeded
 * app names, matching the facet dropdowns).
 *
 * The bar normally sources value suggestions from Elasticsearch via
 * `kql.autocomplete.getValueSuggestions`, but the lab entities are purely
 * in-memory (there's no backing index — see `entity_kql.ts`), so ES returns
 * nothing. We wrap that shared function and, *only* for our ad-hoc data view
 * (matched by id), compute distinct values from the seeded entities;
 * every other data view is delegated untouched to the original. The wrapper
 * is removed on unmount so the shared service is left exactly as we found it.
 */
export const useEntityValueSuggestions = (
  enabled: boolean,
  dataView: DataView | undefined,
  entities: readonly Entity[]
): void => {
  const {
    dependencies: {
      start: { kql },
    },
  } = useKibana();

  useEffect(() => {
    const autocomplete = kql?.autocomplete;
    const dataViewId = dataView?.id;
    if (!enabled || !autocomplete || !dataViewId) return;

    const original = autocomplete.getValueSuggestions;
    const patched: typeof original = (args) => {
      if (args?.indexPattern?.id === dataViewId) {
        const fieldName = args.field?.name ?? '';
        const query = typeof args.query === 'string' ? args.query : '';
        return Promise.resolve(collectFieldValues(entities, fieldName, query));
      }
      return original(args);
    };
    autocomplete.getValueSuggestions = patched;

    return () => {
      // Only restore if no newer instance has re-patched over us, to avoid
      // clobbering a still-active wrapper.
      if (autocomplete.getValueSuggestions === patched) {
        autocomplete.getValueSuggestions = original;
      }
    };
  }, [enabled, dataView, entities, kql]);
};
