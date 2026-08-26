/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { DataView, FieldSpec } from '@kbn/data-views-plugin/public';
import { useKibana } from '../../../hooks/use_kibana';

const KEYWORD = (name: string): FieldSpec => ({
  name,
  type: 'string',
  esTypes: ['keyword'],
  aggregatable: true,
  searchable: true,
});

// The fields the ElasticOn Inventory search bar offers for autocomplete
// and "+ Add filter". These mirror the seeded `Entity` shape (see
// `entity_kql.ts`), so a query typed against them actually filters.
const ENTITY_FIELDS: Record<string, FieldSpec> = {
  name: KEYWORD('name'),
  type: KEYWORD('type'),
  category: KEYWORD('category'),
  health: KEYWORD('health'),
  'cloud.provider': KEYWORD('cloud.provider'),
  application: KEYWORD('application'),
  environment: KEYWORD('environment'),
  team: KEYWORD('team'),
  region: KEYWORD('region'),
};

/**
 * An ad-hoc (unsaved) data view describing the fake entity fields, purely
 * so the unified `SearchBar` has fields to autocomplete and to populate
 * the "+ Add filter" builder. There's no backing index — filtering is done
 * in-memory by `compileEntityKql` — so we create it with `skipFetchFields`
 * and swallow any failure (the bar still works for typed KQL without it).
 */
export const useEntityLabDataView = (enabled: boolean): DataView | undefined => {
  const {
    dependencies: {
      start: { dataViews },
    },
  } = useKibana();
  const [dataView, setDataView] = useState<DataView | undefined>();

  useEffect(() => {
    if (!enabled || dataView) return;
    let cancelled = false;
    dataViews
      .create(
        {
          id: 'entity-centric-lab-adhoc',
          title: 'entity-centric-lab*',
          name: 'Entities (lab)',
          fields: ENTITY_FIELDS,
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
  }, [enabled, dataView, dataViews]);

  return dataView;
};
