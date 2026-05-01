/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFilterButton, EuiPopover } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useBulkGetProfiles } from '../../hooks/use_bulk_get_profiles';
import { InlineFilterPopover } from './inline_filter_popover';
import * as i18n from './translations';

interface AlertEpisodesAssigneeFilterProps {
  selectedAssigneeUid?: string;
  onAssigneeChange: (assigneeUid: string | undefined) => void;
  assigneeUids: string[];
  'data-test-subj'?: string;
}

export function AlertEpisodesAssigneeFilter({
  selectedAssigneeUid,
  onAssigneeChange,
  assigneeUids,
  'data-test-subj': dataTestSubj = 'assigneeFilter',
}: AlertEpisodesAssigneeFilterProps) {
  const { userProfile, notifications } = useKibana<CoreStart>().services;
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: profiles = [], isLoading } = useBulkGetProfiles({
    userProfile,
    uids: assigneeUids,
    toasts: notifications.toasts,
    errorTitle: i18n.ASSIGNEE_FILTER_BULK_GET_ERROR_TITLE,
  });

  const allOptions = useMemo(
    () =>
      profiles.map((p) => ({
        label: p.user.full_name || p.user.email || p.user.username,
        value: p.uid,
      })),
    [profiles]
  );

  const options = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [allOptions, search]);

  const handleSelectionChange = useCallback(
    (values: string[]) => {
      onAssigneeChange(values.length > 0 ? values[0] : undefined);
    },
    [onAssigneeChange]
  );

  return (
    <EuiPopover
      aria-label={i18n.ASSIGNEE_FILTER_ARIA_LABEL}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          hasActiveFilters={!!selectedAssigneeUid}
          numFilters={allOptions.length}
          numActiveFilters={selectedAssigneeUid ? 1 : undefined}
          data-test-subj={`${dataTestSubj}-button`}
        >
          {i18n.ASSIGNEE_FILTER_LABEL}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
    >
      <InlineFilterPopover
        options={options}
        selectedValues={selectedAssigneeUid ? [selectedAssigneeUid] : []}
        singleSelect={true}
        onSelectionChange={handleSelectionChange}
        searchable={true}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={i18n.ASSIGNEE_FILTER_SEARCH_PLACEHOLDER}
        emptyMessage={i18n.ASSIGNEE_FILTER_NO_MATCH}
        isLoading={isLoading}
        data-test-subj={`${dataTestSubj}-popover`}
      />
    </EuiPopover>
  );
}
