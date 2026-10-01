/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { DataView, FieldSpec } from '@kbn/data-views-plugin/public';
import { useKibana } from '../../../hooks/use_kibana';
import type { EntityCategoryId } from './fake_entities';
import { getEntitySearchFieldNames } from './entity_search_fields';

const KEYWORD = (name: string): FieldSpec => ({
  name,
  type: 'string',
  esTypes: ['keyword'],
  aggregatable: true,
  searchable: true,
});

const buildEntitySearchFields = (
  categoryScope?: EntityCategoryId
): Record<string, FieldSpec> =>
  Object.fromEntries(
    getEntitySearchFieldNames(categoryScope).map((name) => [name, KEYWORD(name)])
  );

/**
 * An ad-hoc (unsaved) data view describing the fake entity fields, purely
 * so the unified `SearchBar` has fields to autocomplete and to populate
 * the "+ Add filter" builder. There's no backing index — filtering is done
 * in-memory by `compileEntityKql` — so we create it with `skipFetchFields`
 * and swallow any failure (the bar still works for typed KQL without it).
 */
export const useEntityLabDataView = (
  enabled: boolean,
  categoryScope?: EntityCategoryId
): DataView | undefined => {
  const {
    dependencies: {
      start: { dataViews },
    },
  } = useKibana();
  const [dataView, setDataView] = useState<DataView | undefined>();

  useEffect(() => {
    if (!enabled) {
      setDataView(undefined);
      return;
    }
    let cancelled = false;
    setDataView(undefined);
    dataViews
      .create(
        {
          id: 'entity-centric-lab-adhoc',
          title: 'entity-centric-lab*',
          name: 'Entities (lab)',
          fields: buildEntitySearchFields(categoryScope),
        },
        true
      )
      .then((created) => {
        if (!cancelled) setDataView(created);
      })
      .catch(() => {
        // No backing index / creation blocked — degrade gracefully.
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, categoryScope, dataViews]);

  return dataView;
};
