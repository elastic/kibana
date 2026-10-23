/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFilterButton } from '@elastic/eui';
import type { BoostProfileType } from '../../common/types';
import { PROFILE_TYPE_LABELS } from './format';

const PROFILE_TYPES: readonly BoostProfileType[] = ['indices', 'data_streams'];

interface TypeFilterProps {
  /** The type shown, or undefined for both. */
  value?: BoostProfileType;
  onChange: (value?: BoostProfileType) => void;
  /** How many rows each type would show, with the search and any other filters. */
  counts: Readonly<Record<BoostProfileType, number>>;
}

/**
 * Indices and Data streams toggles for a filter group, set up like EUI's toggle group filter, but
 * kept out of the search box so its text stays the user's. Each counts what it would show, like the
 * rule details page's filters.
 */
export const TypeFilter = ({ value, onChange, counts }: TypeFilterProps) => (
  <>
    {PROFILE_TYPES.map((type, index) => {
      const isActive = value === type;
      return (
        <EuiFilterButton
          key={type}
          isToggle
          isSelected={isActive}
          hasActiveFilters={isActive}
          numFilters={counts[type]}
          // A filter with nothing to show is off, unless it's on already.
          isDisabled={counts[type] === 0 && !isActive}
          aria-pressed={isActive}
          withNext={index < PROFILE_TYPES.length - 1}
          onClick={() => onChange(isActive ? undefined : type)}
          data-test-subj={`boostTypeFilter-${type}`}
        >
          {PROFILE_TYPE_LABELS[type]}
        </EuiFilterButton>
      );
    })}
  </>
);

/** Whether a row of this type passes the filter. */
export const matchesTypeFilter = (
  value: BoostProfileType | undefined,
  type: BoostProfileType | undefined
): boolean => value === undefined || value === type;

/** How many rows of each type there are, for the filter's counts. */
export const countByType = <T,>(
  rows: readonly T[],
  getType: (row: T) => BoostProfileType | undefined
): Record<BoostProfileType, number> =>
  rows.reduce<Record<BoostProfileType, number>>(
    (counts, row) => {
      const type = getType(row);
      return type ? { ...counts, [type]: counts[type] + 1 } : counts;
    },
    { indices: 0, data_streams: 0 }
  );
