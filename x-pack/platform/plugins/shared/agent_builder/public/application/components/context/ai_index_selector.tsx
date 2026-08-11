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
  /** AI indices assigned to the agent: editable, and the only ones a change writes back. */
  assignedIds: string[];
  /**
   * AI indices inherited from the agent's type. They always apply and cannot be removed here, so
   * they render ticked and disabled, and are never sent back on save.
   */
  inheritedIds: string[];
  isDisabled: boolean;
  /** Receives the new assigned list; inherited ids are never included. */
  onChange: (assignedIds: string[]) => void;
}

export const AiIndexSelector: React.FC<AiIndexSelectorProps> = ({
  agentName,
  aiIndices,
  assignedIds,
  inheritedIds,
  isDisabled,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { navigateToContextEngine } = useNavigation();

  const assignedIdSet = useMemo(() => new Set(assignedIds), [assignedIds]);
  // Every inherited id is disabled, including one the agent is also assigned: it applies
  // regardless, so unticking it would drop the assignment and change nothing on screen.
  const inheritedIdSet = useMemo(() => new Set(inheritedIds), [inheritedIds]);

  const options = useMemo<EuiSelectableOption[]>(() => {
    const registeredIds = new Set(aiIndices.map((aiIndex) => aiIndex.id));

    // Inherited and assigned ids are listed even when the Context Engine does not know them:
    // a type may point at an unregistered index, and an agent may reference one that was deleted.
    // Omitting an assigned id would also drop it on the next save, since only checked options are sent.
    const orderedIds = [
      ...inheritedIds,
      ...aiIndices.map((aiIndex) => aiIndex.id).filter((id) => !inheritedIdSet.has(id)),
      ...assignedIds.filter((id) => !inheritedIdSet.has(id) && !registeredIds.has(id)),
    ];

    return orderedIds.map((id) => {
      const isInherited = inheritedIdSet.has(id);
      const isUnregistered = !registeredIds.has(id);

      return {
        key: id,
        label: id,
        checked: isInherited || assignedIdSet.has(id) ? 'on' : undefined,
        disabled: isInherited,
        append: isInherited ? (
          <EuiBadge color="hollow">{labels.context.inheritedAiIndexBadge}</EuiBadge>
        ) : isUnregistered ? (
          <EuiBadge color="warning">{labels.context.unregisteredAiIndexBadge}</EuiBadge>
        ) : undefined,
      };
    });
  }, [aiIndices, inheritedIds, inheritedIdSet, assignedIds, assignedIdSet]);

  // Inherited ids belong to the type, so they are stripped before saving even when the agent is
  // also assigned one — persisting them would be redundant and imply they are editable.
  const handleChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      onChange(
        newOptions
          .filter((option) => option.checked === 'on')
          .map((option) => option.key as string)
          .filter((id) => !inheritedIdSet.has(id))
      );
    },
    [onChange, inheritedIdSet]
  );

  // Everything the agent retrieves from. An id in both lists is counted once.
  const effectiveIds = useMemo(
    () => [...inheritedIds, ...assignedIds.filter((id) => !inheritedIdSet.has(id))],
    [inheritedIds, inheritedIdSet, assignedIds]
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
