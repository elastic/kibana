/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  RULES_LIST_VISIBLE_COLUMNS_STORAGE_KEY,
  resolveVisibleColumnIds,
  type RulesListColumnId,
} from './rules_list_columns';

interface RulesListVisibleColumns {
  visibleColumnIds: RulesListColumnId[];
  setVisibleColumnIds: (ids: RulesListColumnId[]) => void;
}

/** Visible optional columns of the rules list, persisted in localStorage. */
export const useRulesListVisibleColumns = (): RulesListVisibleColumns => {
  const [storedValue, setStoredValue] = useLocalStorage<unknown>(
    RULES_LIST_VISIBLE_COLUMNS_STORAGE_KEY
  );
  const visibleColumnIds = useMemo(() => resolveVisibleColumnIds(storedValue), [storedValue]);

  return { visibleColumnIds, setVisibleColumnIds: setStoredValue };
};
