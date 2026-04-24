/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFilterGroup } from '@elastic/eui';

import { useCasesContext } from '../cases_context/use_cases_context';
import type { MultiSelectFilterOption } from '../all_cases/multi_select_filter';
import { MultiSelectFilter } from '../all_cases/multi_select_filter';
import * as i18n from './translations';

export const ATTACHMENT_TYPE_FILTER_ID = 'attachmentType';

interface AttachmentTypeFilterProps {
  isLoading?: boolean;
  selectedAttachmentTypes: string[];
  onAttachmentTypesChange: (selectedAttachmentTypes: string[]) => void;
}

export const AttachmentTypeFilter = React.memo<AttachmentTypeFilterProps>(
  ({ selectedAttachmentTypes, onAttachmentTypesChange, isLoading = false }) => {
    const { unifiedAttachmentTypeRegistry } = useCasesContext();

    const options = useMemo<Array<MultiSelectFilterOption<string>>>(() => {
      return unifiedAttachmentTypeRegistry
        .list()
        .map((item) => ({ key: item.id, label: item.displayName }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }, [unifiedAttachmentTypeRegistry]);

    const onChange = useCallback(
      ({ selectedOptionKeys }: { filterId: string; selectedOptionKeys: string[] }) => {
        onAttachmentTypesChange(selectedOptionKeys);
      },
      [onAttachmentTypesChange]
    );

    return (
      <EuiFilterGroup data-test-subj="user-actions-attachment-type-filter-group">
        <MultiSelectFilter<string>
          id={ATTACHMENT_TYPE_FILTER_ID}
          buttonLabel={i18n.TYPE}
          onChange={onChange}
          options={options}
          selectedOptionKeys={selectedAttachmentTypes}
          isLoading={isLoading}
        />
      </EuiFilterGroup>
    );
  }
);

AttachmentTypeFilter.displayName = 'AttachmentTypeFilter';
