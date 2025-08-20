/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { CaseUI } from '../../../../common';
import { CaseSuggestionItem } from './case_suggestion_item';
import { useCaseSuggestions } from '../use_case_suggestions';

export const CaseSuggestions = ({ caseData }: { caseData: CaseUI }) => {
  const { visibleSuggestions, isLoadingSuggestions, setDismissedIds, componentById } =
    useCaseSuggestions({
      caseData,
    });

  if (isLoadingSuggestions) {
    return <EuiLoadingSpinner size="m" />;
  }
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="m" wrap direction="column">
        {visibleSuggestions.map((suggestion) => {
          return (
            <CaseSuggestionItem
              key={suggestion.id}
              suggestion={suggestion}
              caseData={caseData}
              setDismissedIds={setDismissedIds}
              componentById={componentById}
            />
          );
        })}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

CaseSuggestions.displayName = 'CaseSuggestions';
