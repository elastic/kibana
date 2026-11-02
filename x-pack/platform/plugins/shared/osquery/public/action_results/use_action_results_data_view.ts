/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import type { DataView } from '@kbn/data-plugin/common';
import { useKibana } from '../common/lib/kibana';

const STATUS_COLUMNS = [
  { name: 'status', type: 'keyword' as const },
  { name: 'agent_id', type: 'keyword' as const },
  { name: 'action_response.osquery.count', type: 'long' as const },
  { name: 'error', type: 'keyword' as const },
];

/**
 * Creates a lightweight, ad-hoc DataView with only the static status columns.
 * No ES field fetch — all fields are added as runtime fields.
 */
export const useActionResultsDataView = (): DataView | undefined => {
  const dataViews = useKibana().services.data.dataViews;
  const [dataView, setDataView] = useState<DataView>();

  useEffect(() => {
    let cancelled = false;

    dataViews
      .create({ title: '' }, true)
      .then((dv) => {
        if (cancelled) return;

        for (const col of STATUS_COLUMNS) {
          dv.addRuntimeField(col.name, { type: col.type });
        }

        setDataView(dv);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [dataViews]);

  return dataView;
};
