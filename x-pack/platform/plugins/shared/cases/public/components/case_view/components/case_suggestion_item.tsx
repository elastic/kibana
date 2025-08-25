/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import type { SuggestionItem } from '../../../../common/types/domain';
import type { SuggestionType } from '../../..';
import type { CaseUI } from '../../../../common';
import * as i18n from '../../../common/translations';
import { useCaseSuggestionItem } from '../use_case_suggestion_item';

const ITEM_HEIGHT = 350;

export const CaseSuggestionItem = ({
  suggestion,
  caseData,
  setDismissedIds,
  componentById,
}: {
  suggestion: SuggestionItem;
  caseData: CaseUI;
  setDismissedIds: (callback: (prev: string[]) => string[]) => void;
  componentById: Map<string, SuggestionType['children']>;
}) => {
  const {
    isAddingSuggestionToCase,
    onAddSuggestionToCase,
    onDismissSuggestion,
    InjectedComponent,
  } = useCaseSuggestionItem({
    suggestion,
    caseData,
    setDismissedIds,
    componentById,
  });

  if (!InjectedComponent) {
    return null;
  }

  return (
    <EuiFlexItem data-test-subj={`suggestion-${suggestion.id}`}>
      <EuiPanel
        paddingSize="m"
        style={{ height: ITEM_HEIGHT, display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="sparkles" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" css={{ fontWeight: 'bold' }}>
                  {i18n.SUGGESTION}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              onClick={onDismissSuggestion}
              aria-label={i18n.DISMISS_SUGGESTION_ARIA_LABEL}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText size="s">{suggestion.description}</EuiText>
        <div style={{ height: '100%', display: 'flex' }}>
          <InjectedComponent suggestion={suggestion} />
        </div>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              color="primary"
              onClick={onDismissSuggestion}
              aria-label={i18n.DISMISS_SUGGESTION_ARIA_LABEL}
              data-test-subj={`dismiss-suggestion-${suggestion.id}-button`}
            >
              {i18n.DISMISS}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill
              iconType="plusInCircle"
              isLoading={isAddingSuggestionToCase}
              onClick={onAddSuggestionToCase}
              aria-label={i18n.ADD_TO_CASE}
              data-test-subj={`add-suggestion-${suggestion.id}-button`}
            >
              {i18n.ADD_TO_CASE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
};

CaseSuggestionItem.displayName = 'CaseSuggestionItem';
