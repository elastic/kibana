/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { MAX_CASES_TO_MERGE } from '../../../common/constants';
import type { CaseUI } from '../../containers/types';
import { useGetCases } from '../../containers/use_get_cases';
import { statuses } from '../status/config';
import type { MergeCaseSummary } from './use_merge_flyout_state';
import { toMergeCaseSummary } from './use_merge_flyout_state';
import { getCaseReference } from './utils';
import * as i18n from './translations';

const SEARCH_DEBOUNCE_MS = 300;
const PER_PAGE = 10;

/** A bare number searches by case number, the same as `#number`. */
const toSearch = (value: string): string => {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? `#${trimmed}` : trimmed;
};

interface MergeAddCasesProps {
  selectedCases: MergeCaseSummary[];
  /** The solution of the selected cases; only its cases can be added. */
  owner?: string;
  onAddCase: (theCase: MergeCaseSummary) => void;
  isDisabled: boolean;
}

/** Finds cases by title or number to add them to the merge. */
export const MergeAddCases = React.memo<MergeAddCasesProps>(
  ({ selectedCases, owner, onAddCase, isDisabled }) => {
    const [searchValue, setSearchValue] = useState('');
    const [search, setSearch] = useState('');
    useDebounce(() => setSearch(toSearch(searchValue)), SEARCH_DEBOUNCE_MS, [searchValue]);

    const isFull = selectedCases.length >= MAX_CASES_TO_MERGE;
    const { data, isFetching } = useGetCases({
      filterOptions: { search, ...(owner != null ? { owner: [owner] } : {}) },
      queryParams: { perPage: PER_PAGE },
    });

    const options = useMemo<Array<EuiComboBoxOptionOption<CaseUI>>>(() => {
      const selectedIds = new Set(selectedCases.map(({ id }) => id));
      return (data?.cases ?? [])
        .filter(({ id }) => !selectedIds.has(id))
        .map((theCase) => ({
          key: theCase.id,
          label:
            theCase.incrementalId != null
              ? `${getCaseReference(theCase)} ${theCase.title}`
              : theCase.title,
          append: <span>{statuses[theCase.status]?.label ?? theCase.status}</span>,
          value: theCase,
          'data-test-subj': `merge-cases-add-option-${theCase.id}`,
        }));
    }, [data?.cases, selectedCases]);

    return (
      <EuiFormRow
        fullWidth
        label={i18n.ADD_CASES}
        helpText={isFull ? i18n.ADD_CASES_LIMIT(MAX_CASES_TO_MERGE) : undefined}
      >
        <EuiComboBox<CaseUI>
          fullWidth
          compressed
          async
          placeholder={i18n.ADD_CASES_PLACEHOLDER}
          options={options}
          selectedOptions={[]}
          isLoading={isFetching}
          isDisabled={isDisabled || isFull}
          onSearchChange={setSearchValue}
          onChange={(selected) => {
            const [{ value } = { value: undefined }] = selected;
            if (value != null) {
              onAddCase(toMergeCaseSummary(value));
              setSearchValue('');
            }
          }}
          aria-label={i18n.ADD_CASES}
          data-test-subj="merge-cases-add-cases"
        />
      </EuiFormRow>
    );
  }
);
MergeAddCases.displayName = 'MergeAddCases';
