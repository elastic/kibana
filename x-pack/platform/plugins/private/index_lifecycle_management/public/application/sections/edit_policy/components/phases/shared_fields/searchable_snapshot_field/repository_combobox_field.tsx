/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';

import type { FieldHook } from '../../../../../../../shared_imports';
import { ComboBoxField } from '../../../../../../../shared_imports';
import { useGlobalFields } from '../../../../form';

interface PropsRepositoryCombobox {
  field: FieldHook;
  isLoading: boolean;
  repos: string[];
  noSuggestions: boolean;
  globalRepository: string;
}

export const RepositoryComboBoxField = ({
  field,
  isLoading,
  repos,
  noSuggestions,
  globalRepository,
}: PropsRepositoryCombobox) => {
  const isMounted = useRef(false);
  const { setValue } = field;
  const {
    searchableSnapshotRepo: { setValue: setSearchableSnapshotRepository },
  } = useGlobalFields();

  useEffect(() => {
    // We keep our phase searchable action field in sync
    // with the default repository field declared globally for the policy
    if (isMounted.current) {
      setValue(Boolean(globalRepository.trim()) ? [globalRepository] : []);
    }
    isMounted.current = true;
  }, [setValue, globalRepository]);

  return (
    <ComboBoxField
      field={field}
      fullWidth={false}
      euiFieldProps={{
        'data-test-subj': 'searchableSnapshotCombobox',
        options: repos.map((repo) => ({ label: repo, value: repo })),
        singleSelection: { asPlainText: true },
        isLoading,
        noSuggestions,
        onCreateOption: (newOption: string) => {
          setSearchableSnapshotRepository(newOption);
        },
        onChange: (options: EuiComboBoxOptionOption[]) => {
          if (options.length > 0) {
            setSearchableSnapshotRepository(options[0].label);
          } else {
            setSearchableSnapshotRepository('');
          }
        },
      }}
    />
  );
};
