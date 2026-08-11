/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
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
  /**
   * AI indices contributed by the agent's type. They always apply and cannot be removed here, so
   * they render ticked and disabled, and are never sent back on save.
   */
  defaultIds: string[];
  isDisabled: boolean;
  onChange: (selectedIds: string[]) => void;
}

export const AiIndexSelector: React.FC<AiIndexSelectorProps> = ({
  agentName,
  aiIndices,
  selectedIds,
  defaultIds,
  isDisabled,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { navigateToContextEngine } = useNavigation();

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  // Every type-contributed id is disabled, including one the agent also stores: it applies
  // regardless, so unticking it would drop it from the agent and change nothing on screen.
  const defaultIdSet = useMemo(() => new Set(defaultIds), [defaultIds]);

  const options = useMemo<EuiSelectableOption[]>(() => {
    const registeredIds = new Set(aiIndices.map((aiIndex) => aiIndex.id));

    // Type-contributed and stored ids are listed even when the Context Engine does not know them:
    // a type may point at an unregistered index, and an agent may reference one that was deleted.
    // Omitting a stored id would also drop it on the next save, since only checked options are sent.
    const orderedIds = [
      ...defaultIds,
      ...aiIndices.map((aiIndex) => aiIndex.id).filter((id) => !defaultIdSet.has(id)),
      ...selectedIds.filter((id) => !defaultIdSet.has(id) && !registeredIds.has(id)),
    ];

    return orderedIds.map((id) => {
      const isDefault = defaultIdSet.has(id);
      const isUnregistered = !registeredIds.has(id);

      return {
        key: id,
        label: id,
        checked: isDefault || selectedIdSet.has(id) ? 'on' : undefined,
        disabled: isDefault,
        append: isDefault ? (
          <EuiBadge color="hollow">{labels.context.defaultAiIndexBadge}</EuiBadge>
        ) : isUnregistered ? (
          <EuiBadge color="warning">{labels.context.unregisteredAiIndexBadge}</EuiBadge>
        ) : undefined,
      };
    });
  }, [aiIndices, defaultIds, defaultIdSet, selectedIds, selectedIdSet]);

  // Type-contributed ids belong to the type, so they are stripped before saving even when the
  // agent already stored one — persisting them would be redundant and imply they are editable.
  const handleChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      onChange(
        newOptions
          .filter((option) => option.checked === 'on')
          .map((option) => option.key as string)
          .filter((id) => !defaultIdSet.has(id))
      );
    },
    [onChange, defaultIdSet]
  );

  // Counts everything the agent retrieves from. An id in both lists is counted once.
  const effectiveIds = useMemo(
    () => [...defaultIds, ...selectedIds.filter((id) => !defaultIdSet.has(id))],
    [defaultIds, defaultIdSet, selectedIds]
  );

  const buttonLabel = useMemo(() => {
    if (effectiveIds.length === 0) {
      return labels.context.selectorPlaceholder;
    }
    if (effectiveIds.length === 1) {
      return effectiveIds[0];
    }
    return labels.context.selectorSelectedCount(effectiveIds.length);
  }, [effectiveIds]);

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
            numActiveFilters={effectiveIds.length || undefined}
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
