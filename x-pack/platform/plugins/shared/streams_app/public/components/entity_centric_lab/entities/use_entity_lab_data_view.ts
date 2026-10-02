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
import { getCategoryExtraFilters } from './fake_entities';
import {
  ENTITY_SEARCH_FIELD_LABELS,
  getEntitySearchFieldNames,
} from './entity_search_fields';

const KEYWORD = (name: string, customLabel?: string): FieldSpec => ({
  name,
  type: 'string',
  esTypes: ['keyword'],
  aggregatable: true,
  searchable: true,
  ...(customLabel ? { customLabel } : {}),
});

const labelForField = (name: string, categoryScope?: EntityCategoryId): string | undefined => {
  const fromMap = ENTITY_SEARCH_FIELD_LABELS[name];
  if (fromMap) return fromMap;
  if (!categoryScope) return undefined;
  return getCategoryExtraFilters(categoryScope).find((def) => def.key === name)?.label;
};

const buildEntitySearchFields = (
  categoryScope?: EntityCategoryId,
  isPhase1 = false
): Record<string, FieldSpec> =>
  Object.fromEntries(
    getEntitySearchFieldNames(categoryScope, isPhase1).map((name) => [
      name,
      KEYWORD(name, labelForField(name, categoryScope)),
    ])
  );

/**
 * An ad-hoc (unsaved) data view describing the fake entity fields, purely
 * so the unified `SearchBar` has fields to autocomplete and to populate
 * the "+ Add filter" builder. There's no backing index — filtering is done
 * in-memory by `compileEntityKql` — so we create it with `skipFetchFields`
 * and swallow any failure (the bar still works for typed KQL without it).
 *
 * The id is scoped per category + phase because `dataViews.create` returns a
 * cached instance for a given id and ignores a new `fields` payload — without
 * this, navigating Kubernetes → Storage (or Phase 1 ↔ 3) keeps stale fields.
 */
export const useEntityLabDataView = (
  enabled: boolean,
  categoryScope?: EntityCategoryId,
  isPhase1 = false
): DataView | undefined => {
  const {
    dependencies: {
      start: { dataViews },
    },
  } = useKibana();
  const [dataView, setDataView] = useState<DataView | undefined>();
  const dataViewId = `entity-centric-lab-adhoc-${categoryScope ?? 'all'}-${
    isPhase1 ? 'phase1' : 'phase3'
  }`;

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
          id: dataViewId,
          title: 'entity-centric-lab*',
          name: 'Entities (lab)',
          fields: buildEntitySearchFields(categoryScope, isPhase1),
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
  }, [enabled, categoryScope, isPhase1, dataViewId, dataViews]);

  return dataView;
};
