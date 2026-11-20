/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { Query } from '@elastic/eui';
import type { FieldDefinition } from '@kbn/content-list-provider';
import { filter, SelectableFilterPopover, StandardFilterOption } from '@kbn/content-list-toolbar';
import { PROFILE_FILTER_LABEL } from '../../translations';

export const PROFILE_FIELD = 'profile';

export const createProfileFieldDefinition = (profileNames: readonly string[]): FieldDefinition => ({
  fieldName: PROFILE_FIELD,
  resolveIdToDisplay: (id) => id,
  resolveDisplayToId: (display) => profileNames.find((name) => name === display),
  resolveFuzzyDisplayToIds: (display) =>
    profileNames.filter((name) => name.toLowerCase().includes(display.toLowerCase())),
});

const ProfileNamesContext = createContext<readonly string[]>([]);

export const ProfileNamesProvider = ProfileNamesContext.Provider;

interface ProfileFilterControlProps {
  query?: Query;
  onChange?: (query: Query) => void;
}

const ProfileFilterControl = ({ query, onChange }: ProfileFilterControlProps) => {
  const profileNames = useContext(ProfileNamesContext);

  return (
    <SelectableFilterPopover
      fieldName={PROFILE_FIELD}
      title={PROFILE_FILTER_LABEL}
      query={query}
      onChange={onChange}
      options={profileNames.map((name) => ({ key: name, label: name }))}
      renderOption={(option, { isActive }) => (
        <StandardFilterOption isActive={isActive}>{option.label}</StandardFilterOption>
      )}
      data-test-subj="searchBoostProfileFilter"
    />
  );
};

export const ProfileFilter = filter.createComponent({
  resolve: () => ({ type: 'custom_component' as const, component: ProfileFilterControl }),
});
