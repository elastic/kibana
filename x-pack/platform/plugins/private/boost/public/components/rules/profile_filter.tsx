/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/** Whether each profile is included in or excluded from the rules shown. */
export type ProfileSelections = ReadonlyMap<string, 'on' | 'off'>;

const FILTER_LABEL = i18n.translate('xpack.boost.profileFilter.label', {
  defaultMessage: 'Profile',
});

interface ProfileFilterProps {
  selections: ProfileSelections;
  onChange: (selections: ProfileSelections) => void;
  /** Profile names to filter by, in the order they're listed. */
  profileNames: readonly string[];
}

/**
 * Whether a rule using this profile passes the filter: it must use an included profile, if any are
 * included, and not an excluded one.
 */
export const matchesProfileFilter = (selections: ProfileSelections, profileName: string) => {
  const selection = selections.get(profileName);
  const hasInclusions = [...selections.values()].includes('on');
  return selection !== 'off' && (!hasInclusions || selection === 'on');
};

/**
 * Filters rules by profile, including or excluding each one. EUI's own selection filter can't
 * exclude, so this follows its multi-select filter pattern with an exclusion-aware list.
 */
export const ProfileFilter = ({ selections, onChange, profileNames }: ProfileFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Listed alphabetically whether or not they're selected, so nothing moves while the list is open.
  const options: EuiSelectableOption[] = profileNames.map((name) => ({
    label: name,
    checked: selections.get(name),
  }));
  const activeCount = options.filter(({ checked }) => checked !== undefined).length;

  const onSelectionChange = (
    _options: EuiSelectableOption[],
    _event: unknown,
    { label, checked }: EuiSelectableOption
  ) => {
    const next = new Map(selections);
    if (checked === 'on' || checked === 'off') {
      next.set(label, checked);
    } else {
      next.delete(label);
    }
    onChange(next);
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
