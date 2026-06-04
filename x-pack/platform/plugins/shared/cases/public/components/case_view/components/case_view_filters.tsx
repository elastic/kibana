/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFilterGroup, EuiFlexItem } from '@elastic/eui';

import type { CaseUI } from '../../../../common';
import type { CaseViewFiltersParams } from '../hooks/use_case_view_filters';
import { AttachmentTypeFilter } from './attachment_type_filter';
import { AuthorFilter } from './author_filter';

interface CaseViewFiltersProps {
  caseData: CaseUI;
  state: CaseViewFiltersParams;
  isLoading?: boolean;
  /**
   * Unified attachment type ids to omit from the type filter (e.g. `'comment'`
   * in the attachments tab where comments are not displayed).
   */
  excludedTypes?: readonly string[];
}

/**
 * Renders the attachment-type and author filter triggers as flex items so they
 * slot into any `EuiFlexGroup`. Filter options are computed from the unfiltered
 * `caseData` so both filters stay independently togglable.
 */
export const CaseViewFilters = React.memo<CaseViewFiltersProps>(
  ({ caseData, state, isLoading, excludedTypes }) => (
    <EuiFlexItem grow={false}>
      <EuiFilterGroup data-test-subj="case-view-filters">
        <AttachmentTypeFilter
          caseData={caseData}
          selectedAttachmentTypes={state.selectedAttachmentTypes}
          onAttachmentTypesChange={state.setSelectedAttachmentTypes}
          isLoading={isLoading}
          excludedTypes={excludedTypes}
        />
        <AuthorFilter
          caseData={caseData}
          selectedAuthors={state.selectedAuthors}
          onAuthorsChange={state.setSelectedAuthors}
          isLoading={isLoading}
        />
      </EuiFilterGroup>
    </EuiFlexItem>
  )
);

CaseViewFilters.displayName = 'CaseViewFilters';
