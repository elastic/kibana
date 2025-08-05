/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { User } from '@kbn/elastic-assistant-common';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { useAssistantContext } from '../../..';
import * as i18n from './translations';

interface Props {
  onUserSelect: (user: User) => void;
  selectedUsers: User[];
}

const UserSearchInputComponent: React.FC<Props> = ({ onUserSelect, selectedUsers }) => {
  const { userProfileService } = useAssistantContext();
  const [options, setOptions] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearchChange = (searchValue: string) => {
    setQuery(searchValue);
  };
  const handleSelectionChange = useCallback(
    (selectedOptions) => {
      const user = options.find((u) => u.user.username === selectedOptions[0].label);
      if (user && !selectedUsers.find((u) => u.user.uid === user.user.uid)) {
        onUserSelect(user);
      }
    },
    [onUserSelect, options, selectedUsers]
  );

  useEffect(() => {
    if (!query) return;

    setIsLoading(true);
    userProfileService
      .suggest({ name: query, count: 5 })
      .then((results) => {
        console.log('results', results);
        return setOptions(results);
      })
      .finally(() => setIsLoading(false));
  }, [query, userProfileService]);

  const comboOptions: EuiComboBoxOptionOption[] = options.map((u) => ({
    label: u.user.username,
  }));

  return (
    <EuiComboBox
      placeholder={i18n.INPUT_PLACEHOLDER}
      singleSelection={{ asPlainText: true }}
      options={comboOptions}
      onSearchChange={handleSearchChange}
      onChange={handleSelectionChange}
      isLoading={isLoading}
      noSuggestions={!query}
    />
  );
};

export const UserSearchInput = React.memo(UserSearchInputComponent);
