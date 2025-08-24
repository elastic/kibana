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
import type { AttachmentItem } from '../../../../common/types/domain';
import type { SuggestionType } from '../../..';
import type { CaseUI } from '../../../../common';
import * as i18n from '../../../common/translations';
import { useCaseSuggestionItem } from '../use_case_suggestion_item';

const ITEM_HEIGHT = 350;

export const CaseSuggestionItem = ({
  suggestion,
  caseData,
  setDismissedIds,
}: {
  suggestion: AttachmentItem & {
    injectedComponent: SuggestionType['children'];
  };
  caseData: CaseUI;
  setDismissedIds: (callback: (prev: string[]) => string[]) => void;
}) => {
  const { isAddingSuggestionToCase, onAddSuggestionToCase, onDismissSuggestion } =
    useCaseSuggestionItem({
      suggestion,
      caseData,
      setDismissedIds,
    });

  return (
    <EuiFlexItem>
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
            <EuiButtonIcon iconType="cross" color="text" onClick={onDismissSuggestion} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText size="s">{suggestion.description}</EuiText>
        <suggestion.injectedComponent suggestion={{ data: [suggestion], id: suggestion.id }} />
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" color="primary" onClick={onDismissSuggestion}>
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
