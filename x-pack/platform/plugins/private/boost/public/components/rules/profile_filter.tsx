/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiPopoverTitle, EuiSelectable, Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/** The rule field the filter matches. */
export const PROFILE_FILTER_FIELD = 'boost_profile';

const FILTER_LABEL = i18n.translate('xpack.boost.profileFilter.label', {
  defaultMessage: 'Profile',
});

interface ProfileFilterProps {
  /** The search bar's query, which holds the filter's clauses. */
  query: Query;
  onChange?: (query: Query) => void;
  /** Profile names to filter by, in the order they're listed. */
  profileNames: readonly string[];
}

// Included profiles form one "or" clause, so a rule using any of them matches; excluded ones are
// separate "not" clauses, so a rule using any of them doesn't.
const getChecked = (query: Query, name: string): EuiSelectableOption['checked'] => {
  if (query.getOrFieldClause(PROFILE_FILTER_FIELD, name)) {
    return 'on';
  }
  // A single value typed into the search box can be either.
  const clause = query.getSimpleFieldClause(PROFILE_FILTER_FIELD, name);
  if (!clause) {
    return undefined;
  }
  return Query.isMust(clause) ? 'on' : 'off';
};

/**
 * Filters rules by profile, including or excluding each one. EUI's own selection filter can't
 * exclude, so this follows its multi-select filter pattern with an exclusion-aware list.
 */
export const ProfileFilter = ({ query, onChange, profileNames }: ProfileFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Listed alphabetically whether or not they're selected, so nothing moves while the list is open.
  const options: EuiSelectableOption[] = profileNames.map((name) => ({
    label: name,
    checked: getChecked(query, name),
  }));
  const activeCount = options.filter(({ checked }) => checked !== undefined).length;

  const onSelectionChange = (
    _options: EuiSelectableOption[],
    _event: unknown,
    { label, checked }: EuiSelectableOption
  ) => {
    const cleared = query
      .removeOrFieldValue(PROFILE_FILTER_FIELD, label)
      .removeSimpleFieldValue(PROFILE_FILTER_FIELD, label);
    onChange?.(
      checked === 'on'
        ? cleared.addOrFieldValue(PROFILE_FILTER_FIELD, label, true, 'eq')
        : checked === 'off'
        ? cleared.addSimpleFieldValue(PROFILE_FILTER_FIELD, label, false, 'eq')
        : cleared
    );
  };

  return (
    <EuiPopover
      aria-label={FILTER_LABEL}
      button={
        // Set up like EUI's own selection filter button, so it matches the filters beside it.
        <EuiFilterButton
          iconType="chevronSingleDown"
          iconSide="right"
          grow
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          hasActiveFilters={activeCount > 0}
          numActiveFilters={activeCount > 0 ? activeCount : undefined}
          data-test-subj="boostRulesProfileFilter"
        >
          {FILTER_LABEL}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
    >
      <EuiSelectable
        aria-label={FILTER_LABEL}
        options={options}
        onChange={onSelectionChange}
        allowExclusions
        searchable
        searchProps={{
          compressed: true,
          placeholder: i18n.translate('xpack.boost.profileFilter.searchPlaceholder', {
            defaultMessage: 'Filter list',
          }),
        }}
        listProps={{ paddingSize: 's' }}
        data-test-subj="boostRulesProfileFilterList"
      >
        {(list, search) => (
          <>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
