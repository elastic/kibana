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
import { agentBuilderDefaultAiIndexId } from '@kbn/agent-builder-common';
import { CONTEXT_ENGINE_PATHS } from '@kbn/context-engine-plugin/common/paths';
import type { AiIndexHttpItem } from '@kbn/context-engine-plugin/common/http_api/ai_indices';
import { useNavigation } from '../../hooks/use_navigation';
import { labels } from '../../utils/i18n';

interface AiIndexSelectorProps {
  agentName: string;
  aiIndices: AiIndexHttpItem[];
  selectedIds: string[];
  /**
   * Whether the agent's type merges the default `elastic` AI index in at runtime. When it does,
   * that index is shown ticked and disabled: it always applies and cannot be removed.
   */
  includesDefaultAiIndex: boolean;
  isDisabled: boolean;
  onChange: (selectedIds: string[]) => void;
}

export const AiIndexSelector: React.FC<AiIndexSelectorProps> = ({
  agentName,
  aiIndices,
  selectedIds,
  includesDefaultAiIndex,
  isDisabled,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { navigateToContextEngine } = useNavigation();

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // The default index is only *added* for display when it is not already stored on the agent.
  // Storing it explicitly is redundant but legal, and an unrelated edit must not silently drop it.
  const isDefaultForced =
    includesDefaultAiIndex && !selectedIdSet.has(agentBuilderDefaultAiIndexId);

  const options = useMemo<EuiSelectableOption[]>(() => {
    const knownIds = new Set(aiIndices.map((aiIndex) => aiIndex.id));
    const items = [...aiIndices];

    // The default is registered in the Context Engine, so it is normally already in the list.
    // Fall back to a synthetic entry if it has not been registered yet (first boot, for example).
    if (includesDefaultAiIndex && !knownIds.has(agentBuilderDefaultAiIndexId)) {
      items.unshift({ id: agentBuilderDefaultAiIndexId } as AiIndexHttpItem);
    }

    return items.map((aiIndex) => {
      const isDefault = includesDefaultAiIndex && aiIndex.id === agentBuilderDefaultAiIndexId;
      return {
        key: aiIndex.id,
        label: aiIndex.id,
        checked: isDefault || selectedIdSet.has(aiIndex.id) ? 'on' : undefined,
        disabled: isDefault,
        append: isDefault ? (
          <EuiBadge color="hollow">{labels.context.defaultAiIndexBadge}</EuiBadge>
        ) : undefined,
      };
    });
  }, [aiIndices, includesDefaultAiIndex, selectedIdSet]);

  const handleChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const checkedIds = newOptions
        .filter((option) => option.checked === 'on')
        .map((option) => option.key as string);

      onChange(
        isDefaultForced
          ? checkedIds.filter((id) => id !== agentBuilderDefaultAiIndexId)
          : checkedIds
      );
    },
    [onChange, isDefaultForced]
  );

  // The button reports everything the agent actually retrieves from, including the forced default.
  const buttonLabel = useMemo(() => {
    const effectiveIds = isDefaultForced
      ? [agentBuilderDefaultAiIndexId, ...selectedIds]
      : selectedIds;

    if (effectiveIds.length === 0) {
      return labels.context.selectorPlaceholder;
    }
    if (effectiveIds.length === 1) {
      return effectiveIds[0];
    }
    return labels.context.selectorSelectedCount(effectiveIds.length);
  }, [selectedIds, isDefaultForced]);

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
