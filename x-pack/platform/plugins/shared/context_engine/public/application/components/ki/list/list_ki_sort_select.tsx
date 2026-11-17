/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect, type EuiSelectOption } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { ChangeEvent } from 'react';
import React, { useCallback, useMemo } from 'react';
import { KI_LIST_SORTS, type KiListSort } from '../../../../../common/ki_list_sort';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';

const SORT_LABELS: Record<KiListSort, string> = {
  updated: i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.sortRecentlyUpdated', {
    defaultMessage: 'Recently updated',
  }),
  title: i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.sortTitle', {
    defaultMessage: 'Title A to Z',
  }),
};

const isKiListSort = (value: string): value is KiListSort =>
  KI_LIST_SORTS.some((option) => option === value);

interface ListKiSortSelectProps {
  sort: KiListSort;
  onSortChange: (sort: KiListSort) => void;
}

export const ListKiSortSelect = ({ sort, onSortChange }: ListKiSortSelectProps) => {
  const options = useMemo(
    (): EuiSelectOption[] => KI_LIST_SORTS.map((value) => ({ value, text: SORT_LABELS[value] })),
    []
  );

  const handleChange = useCallback(
    ({ target: { value } }: ChangeEvent<HTMLSelectElement>) => {
      if (isKiListSort(value)) {
        onSortChange(value);
      }
    },
    [onSortChange]
  );

  return (
    <EuiSelect
      options={options}
      value={sort}
      onChange={handleChange}
      aria-label={i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.sortLabel', {
        defaultMessage: 'Sort Knowledge documents',
      })}
      data-test-subj="contextListKiSortSelect"
      {...getEbtProps({
        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageListKiPanel,
        action: CONTEXT_ENGINE_UI_EBT.action.listKi.SORT,
      })}
    />
  );
};
