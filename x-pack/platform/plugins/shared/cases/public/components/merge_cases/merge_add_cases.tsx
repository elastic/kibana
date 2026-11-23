/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiHighlight,
  EuiPopover,
  EuiSelectable,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { Status } from '@kbn/cases-components';
import { MAX_CASES_TO_MERGE } from '../../../common/constants';
import { SortFieldCase } from '../../../common/ui/types';
import type { CaseUI } from '../../containers/types';
import { useGetCases } from '../../containers/use_get_cases';
import { severities } from '../severity/config';
import type { MergeCaseSummary } from './use_merge_flyout_state';
import { toMergeCaseSummary } from './use_merge_flyout_state';
import * as i18n from './translations';

/** How many of the solution's most recently updated cases, or search matches, the list shows. */
const CANDIDATE_COUNT = 50;
const SEARCH_DEBOUNCE_MS = 300;
/** Two lines per row: the number, title, status and severity, then the case's other facts. */
const ROW_HEIGHT = 56;
/**
 * Four and a half rows, so the half row shows the list scrolls. The list keeps this height while
 * loading, empty or filtered: the popover picks the side of the button with room when it opens,
 * and doesn't jump as the user types.
 */
const LIST_HEIGHT = 4.5 * ROW_HEIGHT;

interface MergeAddCasesProps {
  selectedCases: MergeCaseSummary[];
  /** The solution of the selected cases; only its cases are offered. */
  owner?: string;
  onAddCase: (theCase: MergeCaseSummary) => void;
  onRemoveCase: (caseId: string) => void;
  isDisabled: boolean;
}

/**
 * Opens a searchable list of the solution's cases from a text button. The merge's cases are
 * ticked; ticking a case adds it to the merge and unticking one removes it.
 */
export const MergeAddCases = React.memo<MergeAddCasesProps>(
  ({ selectedCases, owner, onAddCase, onRemoveCase, isDisabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const searchId = useGeneratedHtmlId({ prefix: 'mergeAddCasesSearch' });

    const toggle = useCallback(() => setIsOpen((open) => !open), []);
    const close = useCallback(() => setIsOpen(false), []);

    return (
      <EuiPopover
        button={
          <EuiButtonEmpty
            size="s"
            flush="right"
            iconType="plusCircle"
            onClick={toggle}
            isDisabled={isDisabled}
            aria-expanded={isOpen}
            data-test-subj="merge-cases-add-cases-button"
          >
            {i18n.ADD_CASES}
          </EuiButtonEmpty>
        }
        isOpen={isOpen}
        closePopover={close}
        anchorPosition="downRight"
        panelPaddingSize="none"
        ownFocus
        initialFocus={`[id="${searchId}"]`}
        repositionOnScroll
        aria-label={i18n.ADD_CASES}
        data-test-subj="merge-cases-add-cases"
        panelProps={{ 'data-test-subj': 'merge-cases-add-cases-panel' }}
      >
        <AddCasesPanel
          selectedCases={selectedCases}
          owner={owner}
          searchId={searchId}
          onAddCase={onAddCase}
          onRemoveCase={onRemoveCase}
        />
      </EuiPopover>
    );
  }
);
MergeAddCases.displayName = 'MergeAddCases';

interface AddCasesPanelProps {
  selectedCases: MergeCaseSummary[];
  owner?: string;
  searchId: string;
  onAddCase: (theCase: MergeCaseSummary) => void;
  onRemoveCase: (caseId: string) => void;
}

/** The popover's content, mounted only while it's open so every opening starts afresh. */
const AddCasesPanel = ({
  selectedCases,
  owner,
  searchId,
  onAddCase,
  onRemoveCase,
}: AddCasesPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useDebounce(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS, [search]);

  const { data, isLoading, isFetching, isError } = useGetCases({
    filterOptions: {
      ...(owner != null ? { owner: [owner] } : {}),
      search: debouncedSearch,
      // Like the add-to-case pickers: a closed case that was merged away is done with.
      merged: ['excludeClosed'],
    },
    queryParams: {
      perPage: CANDIDATE_COUNT,
      sortField: SortFieldCase.updatedAt,
      sortOrder: 'desc',
    },
  });

  const casesById = useMemo(
    () => new Map<string, CaseUI>((data?.cases ?? []).map((theCase) => [theCase.id, theCase])),
    [data?.cases]
  );
  const inMergeIds = useMemo(() => new Set(selectedCases.map(({ id }) => id)), [selectedCases]);
  const isFull = selectedCases.length >= MAX_CASES_TO_MERGE;

  const options = useMemo<EuiSelectableOption[]>(
    () =>
      [...casesById.values()].map((theCase) => {
        const isInMerge = inMergeIds.has(theCase.id);
        return {
          key: theCase.id,
          label:
            theCase.incrementalId != null
              ? `#${theCase.incrementalId} ${theCase.title}`
              : theCase.title,
          checked: isInMerge ? 'on' : undefined,
          // A full merge still lets its cases be unticked.
          disabled: !isInMerge && isFull,
          'data-test-subj': `merge-add-cases-option-${theCase.id}`,
        };
      }),
    [casesById, inMergeIds, isFull]
  );

  const onChange = useCallback(
    (
      _options: EuiSelectableOption[],
      _event: unknown,
      changedOption: EuiSelectableOption | undefined
    ) => {
      const theCase = casesById.get(changedOption?.key ?? '');
      if (theCase == null) {
        return;
      }
      if (inMergeIds.has(theCase.id)) {
        onRemoveCase(theCase.id);
      } else if (!isFull) {
        onAddCase(toMergeCaseSummary(theCase));
      }
    },
    [casesById, inMergeIds, isFull, onAddCase, onRemoveCase]
  );

  const rowStyles = useMemo(
    () => ({
      row: css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.xs};
        min-width: 0;
      `,
      line: css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.s};
        min-width: 0;
      `,
      shrinkable: css`
        min-width: 0;
      `,
      // Badges keep their size; the text beside them is what gets cut off.
      badges: css`
        flex: none;
        display: flex;
        gap: ${euiTheme.size.xs};
      `,
    }),
    [euiTheme]
  );

  const renderOption = useCallback(
    (option: EuiSelectableOption, searchValue: string) => {
      const theCase = casesById.get(option.key ?? '');
      if (theCase == null) {
        return option.label;
      }
      return (
        <span css={rowStyles.row}>
          <span css={rowStyles.line}>
            {theCase.incrementalId != null ? (
              <EuiText size="s" color="subdued" component="span">
                {`#${theCase.incrementalId}`}
              </EuiText>
            ) : null}
            <EuiText
              size="s"
              component="span"
              className="eui-textTruncate"
              css={rowStyles.shrinkable}
            >
              <strong>
                <EuiHighlight search={searchValue}>{theCase.title}</EuiHighlight>
              </strong>
            </EuiText>
          </span>
          <span css={rowStyles.line}>
            <span css={rowStyles.badges}>
              <Status status={theCase.status} />
              <EuiBadge color={severities[theCase.severity].badgeColor}>
                {severities[theCase.severity].label}
              </EuiBadge>
            </span>
            <EuiText
              size="xs"
              color="subdued"
              component="span"
              className="eui-textTruncate"
              css={rowStyles.shrinkable}
            >
              <UpdatedWhen theCase={theCase} />
            </EuiText>
          </span>
        </span>
      );
    },
    [casesById, rowStyles]
  );

  return (
    <div
      css={css`
        inline-size: ${euiTheme.base * 32}px;
        max-inline-size: 90vw;
      `}
    >
      <EuiSelectable
        aria-label={i18n.CASES_TO_MERGE}
        searchable
        isPreFiltered
        searchProps={{
          id: searchId,
          value: search,
          onChange: (value: string) => setSearch(value),
          placeholder: i18n.ADD_CASES_SEARCH_PLACEHOLDER,
          'aria-label': i18n.ADD_CASES_SEARCH_PLACEHOLDER,
          isLoading: isFetching && !isLoading,
          compressed: true,
          'data-test-subj': 'merge-add-cases-search',
        }}
        options={options}
        onChange={onChange}
        renderOption={renderOption}
        listProps={{
          rowHeight: ROW_HEIGHT,
          isVirtualized: true,
          showIcons: true,
          'data-test-subj': 'merge-add-cases-list',
        }}
        height={LIST_HEIGHT}
        isLoading={isLoading}
        errorMessage={isError ? i18n.ADD_CASES_ERROR : null}
        emptyMessage={i18n.ADD_CASES_NONE}
        noMatchesMessage={i18n.ADD_CASES_NO_MATCHES}
      >
        {(list, searchField) => (
          <>
            <div
              css={css`
                padding: ${euiTheme.size.s};
                background: ${euiTheme.colors.backgroundBaseSubdued};
                border-block-end: ${euiTheme.border.thin};
              `}
            >
              {searchField}
              {isFull ? (
                <EuiText
                  size="xs"
                  color="warning"
                  role="status"
                  css={css`
                    margin-block-start: ${euiTheme.size.s};
                  `}
                  data-test-subj="merge-add-cases-limit"
                >
                  {i18n.ADD_CASES_LIMIT(MAX_CASES_TO_MERGE)}
                </EuiText>
              ) : null}
            </div>
            <div
              css={css`
                min-block-size: ${LIST_HEIGHT}px;
              `}
            >
              {list}
            </div>
          </>
        )}
      </EuiSelectable>
    </div>
  );
};
AddCasesPanel.displayName = 'AddCasesPanel';

/** "Updated 1 hour ago" */
const UpdatedWhen = ({ theCase }: { theCase: CaseUI }) => (
  <FormattedMessage
    id="xpack.cases.mergeCases.addCasesUpdated"
    defaultMessage="Updated {updated}"
    values={{
      updated: <FormattedRelative value={theCase.updatedAt ?? theCase.createdAt} />,
    }}
  />
);
UpdatedWhen.displayName = 'UpdatedWhen';
