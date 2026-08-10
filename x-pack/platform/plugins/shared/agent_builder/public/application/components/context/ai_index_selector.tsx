/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFilterButton,
  EuiFilterGroup,
  EuiHorizontalRule,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CONTEXT_ENGINE_PATHS } from '@kbn/context-engine-plugin/common/paths';
import type { AiIndexHttpItem } from '@kbn/context-engine-plugin/common/http_api/ai_indices';
import { useNavigation } from '../../hooks/use_navigation';
import { labels } from '../../utils/i18n';

interface AiIndexSelectorProps {
  agentName: string;
  aiIndices: AiIndexHttpItem[];
  selectedIds: string[];
  isDisabled: boolean;
  onChange: (selectedIds: string[]) => void;
}

export const AiIndexSelector: React.FC<AiIndexSelectorProps> = ({
  agentName,
  aiIndices,
  selectedIds,
  isDisabled,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { navigateToContextEngine } = useNavigation();

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const options = useMemo<EuiSelectableOption[]>(
    () =>
      aiIndices.map((aiIndex) => ({
        key: aiIndex.id,
        label: aiIndex.id,
        checked: selectedIdSet.has(aiIndex.id) ? 'on' : undefined,
      })),
    [aiIndices, selectedIdSet]
  );

  const handleChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      onChange(
        newOptions.filter((option) => option.checked === 'on').map((option) => option.key as string)
      );
    },
    [onChange]
  );

  // The button reports what the agent retrieves from: the single index by name when there is
  // exactly one, a count when there are several, and the always-injected default when empty.
  const buttonLabel = useMemo(() => {
    if (selectedIds.length === 0) {
      return labels.context.selectorPlaceholder;
    }
    if (selectedIds.length === 1) {
      return selectedIds[0];
    }
    return labels.context.selectorSelectedCount(selectedIds.length);
  }, [selectedIds]);

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      aria-label={labels.context.selectorAriaLabel(agentName)}
      button={
        <EuiFilterGroup>
          <EuiFilterButton
            iconType="arrowDown"
            iconSide="right"
            isDisabled={isDisabled}
            onClick={() => setIsOpen((open) => !open)}
            aria-label={labels.context.selectorAriaLabel(agentName)}
            data-test-subj="agentBuilderAiIndexSelectorButton"
            numActiveFilters={selectedIds.length || undefined}
          >
            {buttonLabel}
          </EuiFilterButton>
        </EuiFilterGroup>
      }
    >
      <EuiPanel
        paddingSize="none"
        hasShadow={false}
        css={css`
          min-width: 280px;
        `}
      >
        <EuiSelectable
          aria-label={labels.context.selectorAriaLabel(agentName)}
          options={options}
          onChange={handleChange}
          searchable
          searchProps={{ placeholder: labels.context.selectorSearchPlaceholder, compressed: true }}
          emptyMessage={
            <EuiText size="s" color="subdued">
              <p>{labels.context.noAiIndicesMessage}</p>
            </EuiText>
          }
          data-test-subj="agentBuilderAiIndexSelectable"
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
        <EuiHorizontalRule margin="none" />
        <EuiButtonEmpty
          iconType="plus"
          size="s"
          onClick={() => {
            setIsOpen(false);
            navigateToContextEngine(CONTEXT_ENGINE_PATHS.create);
          }}
          data-test-subj="agentBuilderCreateAiIndexLink"
        >
          {labels.context.createNewAiIndex}
        </EuiButtonEmpty>
      </EuiPanel>
    </EuiPopover>
  );
};
