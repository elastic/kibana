/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect, type EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { ListKiSortValue } from './list_ki_helpers';

interface ListKiSortSelectProps {
  sort: ListKiSortValue;
}

// WIP: needs list API sort/expired (#305092). The list is always "Recently updated" until then.
const handleSortChange = () => {};

export const ListKiSortSelect = ({ sort }: ListKiSortSelectProps) => {
  const options = useMemo(
    (): EuiSelectOption[] => [
      {
        value: 'updated',
        text: i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.sortRecentlyUpdated', {
          defaultMessage: 'Recently updated',
        }),
      },
      {
        value: 'title',
        text: i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.sortTitle', {
          defaultMessage: 'Title A to Z',
        }),
        // WIP: needs list API sort/expired (#305092).
        disabled: true,
      },
    ],
    []
  );

  return (
    <EuiSelect
      options={options}
      value={sort}
      onChange={handleSortChange}
      aria-label={i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.sortLabel', {
        defaultMessage: 'Sort Knowledge documents',
      })}
      data-test-subj="contextListKiSortSelect"
    />
  );
};
