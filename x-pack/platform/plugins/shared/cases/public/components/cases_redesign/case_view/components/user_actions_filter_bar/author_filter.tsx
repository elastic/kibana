/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { sortBy, uniqBy } from 'lodash';

import type { UserWithProfileInfo } from '../../../../../../common/types/domain';
import { useGetCaseUsers } from '../../../../../containers/use_get_case_users';
import * as i18n from './translations';

export const AUTHOR_FILTER_ID = 'userActionsAuthor';

// Sentinel option value representing "no author filter", distinct from any
// real username.
const ALL_AUTHORS_VALUE = '__all__';

type AuthorOption = EuiSelectableOption<{ value: string }>;

const getAuthorLabel = (user: UserWithProfileInfo['user']): string =>
  user.full_name || user.username || user.email || i18n.UNKNOWN_AUTHOR;

interface AuthorEntry {
  key: string;
  label: string;
}

/**
 * Builds the de-duplicated, alphabetically sorted list of author entries from
 * the case's participants (the users who have created user actions on the
 * case). The BE `author` filter matches on `created_by.username`, so entries
 * without a username can't be filtered on and are dropped.
 */
const buildAuthorEntries = (participants: UserWithProfileInfo[]): AuthorEntry[] => {
  const entries = participants.reduce<AuthorEntry[]>((acc, participant) => {
    const key = participant.user.username;
    if (key) {
      acc.push({ key, label: getAuthorLabel(participant.user) });
    }
    return acc;
  }, []);

  return sortBy(uniqBy(entries, 'key'), 'label');
};

interface AuthorFilterProps {
  caseId: string;
  isLoading?: boolean;
  author?: string;
  onAuthorChange: (author?: string) => void;
}

/**
 * Single-selection author filter dropdown (mirroring `TypeFilter` /
 * `SortFilter`). The user_actions `_find` `author` query param accepts only
 * one username, so this is a plain "All / one author" selectable list rather
 * than a multi-select.
 */
export const AuthorFilter = React.memo<AuthorFilterProps>(
  ({ caseId, author, onAuthorChange, isLoading = false }) => {
    const { data: caseUsers, isLoading: isLoadingCaseUsers } = useGetCaseUsers(caseId);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = useCallback(() => setIsPopoverOpen((prevValue) => !prevValue), []);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);

    const authorEntries = useMemo(
      () => buildAuthorEntries(caseUsers?.participants ?? []),
      [caseUsers]
    );

    const options = useMemo<AuthorOption[]>(
      () => [
        {
          label: i18n.ALL_AUTHORS,
          value: ALL_AUTHORS_VALUE,
          checked: !author ? 'on' : undefined,
          'data-test-subj': 'user-actions-filter-bar-author-option-all',
        },
        ...authorEntries.map(({ key, label }) => ({
          label,
          value: key,
          checked: author === key ? ('on' as const) : undefined,
          'data-test-subj': `user-actions-filter-bar-author-option-${key}`,
        })),
      ],
      [author, authorEntries]
    );

    const onChange = useCallback(
      (newOptions: AuthorOption[]) => {
        const selected = newOptions.find((option) => option.checked === 'on');
        if (selected) {
          const newAuthor = selected.value === ALL_AUTHORS_VALUE ? undefined : selected.value;
          if (newAuthor !== author) {
            onAuthorChange(newAuthor);
          }
        }
        closePopover();
      },
      [author, onAuthorChange, closePopover]
    );

    const selectedLabel = useMemo(() => {
      if (!author) return i18n.ALL_AUTHORS;
      return authorEntries.find((entry) => entry.key === author)?.label ?? i18n.UNKNOWN_AUTHOR;
    }, [author, authorEntries]);

    const isDisabled = isLoading || isLoadingCaseUsers;

    return (
      <EuiPopover
        ownFocus
        aria-label={i18n.AUTHOR}
        button={
          <EuiFilterButton
            data-test-subj="user-actions-filter-bar-author-button"
            iconType="arrowDown"
            onClick={togglePopover}
            isSelected={isPopoverOpen}
            hasActiveFilters={Boolean(author)}
            isLoading={isDisabled}
            isDisabled={isDisabled}
          >
            {`${i18n.AUTHOR}: ${selectedLabel}`}
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        repositionOnScroll
        data-test-subj={`options-filter-popover-${AUTHOR_FILTER_ID}`}
      >
        <EuiSelectable<{ value: string }>
          options={options}
          singleSelection="always"
          searchable
          searchProps={{
            placeholder: i18n.AUTHOR,
            compressed: false,
            'data-test-subj': `${AUTHOR_FILTER_ID}-search-input`,
          }}
          onChange={onChange}
          aria-label={i18n.AUTHOR}
        >
          {(list, search) => (
            <div
              css={css`
                width: 260px;
              `}
            >
              {search}
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    );
  }
);

AuthorFilter.displayName = 'AuthorFilter';
