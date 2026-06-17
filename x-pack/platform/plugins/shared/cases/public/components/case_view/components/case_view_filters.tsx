/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFilterGroup, EuiFlexItem } from '@elastic/eui';

import type { CaseUI } from '../../../../common';
import type { CaseViewFiltersResult } from '../hooks/use_case_view_filters';
import { AttachmentTypeFilter } from './attachment_type_filter';
import { AuthorFilter } from './author_filter';

interface CaseViewFiltersProps {
  caseData: CaseUI;
  // Only the filter-control surface is needed
  state: Pick<
    CaseViewFiltersResult,
    | 'selectedAttachmentTypes'
    | 'setSelectedAttachmentTypes'
    | 'selectedAuthors'
    | 'setSelectedAuthors'
  >;
  isLoading?: boolean;
  /**
   * Unified attachment type ids to omit from the type filter (e.g. `'comment'`
   * in the attachments tab where comments are not displayed).
   */
  excludedTypes?: readonly string[];
}

/**
 * Renders the attachment-type and author filter triggers in a single flex item.
 * The shared "Clear filters" affordance lives in the parent layout (see
 * `CaseViewAttachments`) so it sits alongside the search bar, mirroring the
 * pattern used in the all-cases view.
 */
export const CaseViewFilters = React.memo<CaseViewFiltersProps>(
  ({
    caseData,
    state: {
      selectedAttachmentTypes,
      setSelectedAttachmentTypes,
      selectedAuthors,
      setSelectedAuthors,
    },
    isLoading,
    excludedTypes,
  }) => (
    <EuiFlexItem grow={false}>
      <EuiFilterGroup data-test-subj="case-view-filters">
        <AttachmentTypeFilter
          caseData={caseData}
          selectedAttachmentTypes={selectedAttachmentTypes}
          onAttachmentTypesChange={setSelectedAttachmentTypes}
          isLoading={isLoading}
          excludedTypes={excludedTypes}
        />
        <AuthorFilter
          caseData={caseData}
          selectedAuthors={selectedAuthors}
          onAuthorsChange={setSelectedAuthors}
          isLoading={isLoading}
        />
      </EuiFilterGroup>
    </EuiFlexItem>
  )
);

CaseViewFilters.displayName = 'CaseViewFilters';
