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
  EuiBadgeGroup,
  EuiFormControlLayout,
  EuiInputPopover,
  EuiSelectable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { useIsContextEngineEnabled } from '../../../../hooks/use_is_context_engine_enabled';
import { useInheritedAiIndices } from '../../../../hooks/ai_indices/use_inherited_ai_indices';
import { useListAiIndices } from '../../../../hooks/ai_indices/use_list_ai_indices';
import { getActiveAiIndices } from '../../../../utils/ai_indices';
import { labels } from '../../../../utils/i18n';
import type { AgentFormData } from '../agent_form';

interface AiIndicesSectionProps {
  control: Control<AgentFormData>;
  /** Undefined while creating an agent, when there is no persisted agent to inherit from yet. */
  agentId?: string;
  isFormDisabled: boolean;
}

/**
 * Picks the AI indices an agent retrieves from. Only rendered when the Context Engine is on, since
 * nothing retrieves without it.
 */
export const AiIndicesSection: React.FC<AiIndicesSectionProps> = ({
  control,
  agentId,
  isFormDisabled,
}) => {
  const isContextEngineEnabled = useIsContextEngineEnabled();

  if (!isContextEngineEnabled) {
    return null;
  }

  return <AiIndicesSectionContent {...{ control, agentId, isFormDisabled }} />;
};

const AiIndicesSectionContent: React.FC<AiIndicesSectionProps> = ({
  control,
  agentId,
  isFormDisabled,
}) => {
  const { aiIndices, isLoading } = useListAiIndices();
  const { inheritedAiIndicesByAgentId } = useInheritedAiIndices();

  const inheritedIds = useMemo(
    () => (agentId ? inheritedAiIndicesByAgentId[agentId] ?? [] : []),
    [agentId, inheritedAiIndicesByAgentId]
  );

  return (
    <>
      <EuiHorizontalRule />
      <EuiFlexGroup
        direction="row"
        gutterSize="xl"
        alignItems="flexStart"
        aria-labelledby="ai-indices-section-title"
      >
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiIcon type="sortRight" aria-hidden={true} />
              <EuiTitle size="xs">
                <h2 id="ai-indices-section-title">{labels.aiIndices.sectionTitle}</h2>
              </EuiTitle>
            </EuiFlexGroup>
            <EuiText size="s" color="subdued">
              <p>{labels.aiIndices.sectionDescription}</p>
              <p>{labels.aiIndices.notAffectedByElasticCapabilities}</p>
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={2} css={{ minWidth: 0 }}>
          <Controller
            name="configuration.ai_indices"
            control={control}
            render={({ field }) => (
              <AiIndicesFields
                aiIndices={aiIndices}
                assignedIds={field.value ?? []}
                inheritedIds={inheritedIds}
                isLoading={isLoading}
                isFormDisabled={isFormDisabled}
                onChange={field.onChange}
              />
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

/** Keeps the pills clear of the form control's dropdown arrow and clear button. */
const selectedIdsFieldStyles = css`
  min-height: 100%;
  padding: 4px 0;
`;

/** Fills the rest of the control so the whole empty area opens the list, like a combo box does. */
const openButtonStyles = css`
  width: 100%;
  height: 100%;
  text-align: start;
  cursor: pointer;
`;

interface AiIndicesFieldsProps {
  aiIndices: Array<{ id: string; description?: string; managed: boolean }>;
  /** AI indices assigned to the agent itself: editable, and the only ones a change writes back. */
  assignedIds: string[];
  /** AI indices contributed by the agent's type. They always apply and cannot be removed here. */
  inheritedIds: string[];
  isLoading: boolean;
  isFormDisabled: boolean;
  onChange: (assignedIds: string[]) => void;
}

const AiIndicesFields: React.FC<AiIndicesFieldsProps> = ({
  aiIndices,
  assignedIds,
  inheritedIds,
  isLoading,
  isFormDisabled,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const inheritedIdSet = useMemo(() => new Set(inheritedIds), [inheritedIds]);

  const isContextOn =
    getActiveAiIndices({ assigned: assignedIds, inherited: inheritedIds }).length > 0;

  // Inherited ids are listed above as defaults, so they are not offered again here. Selecting one
  // would store an id that already applies, and unselecting it would change nothing on screen.
  const selectedIds = useMemo(
    () => assignedIds.filter((id) => !inheritedIdSet.has(id)),
    [assignedIds, inheritedIdSet]
  );

  const options = useMemo<EuiSelectableOption[]>(() => {
    const selectedIdSet = new Set(selectedIds);
    const registeredIds = aiIndices.map(({ id }) => id).filter((id) => !inheritedIdSet.has(id));
    // An assigned id the Context Engine does not know about (deleted, or beyond the list cap) has
    // no option of its own, so it is added here: leaving it out would drop it on the next save.
    const unregisteredIds = selectedIds.filter((id) => !registeredIds.includes(id));
    const descriptionsById = new Map(aiIndices.map(({ id, description }) => [id, description]));

    return [...registeredIds, ...unregisteredIds].map((id) => {
      const description = descriptionsById.get(id);
      return {
        key: id,
        label: id,
        checked: selectedIdSet.has(id) ? ('on' as const) : undefined,
        append: description ? (
          <EuiText size="xs" color="subdued">
            {description}
          </EuiText>
        ) : undefined,
        'data-test-subj': `agentBuilderAiIndexOption-${id}`,
      };
    });
  }, [aiIndices, inheritedIdSet, selectedIds]);

  const handleSelectableChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      onChange(
        newOptions.filter((option) => option.checked === 'on').map((option) => option.key as string)
      );
    },
    [onChange]
  );

  const handleRemove = useCallback(
    (id: string) => onChange(selectedIds.filter((selected) => selected !== id)),
    [onChange, selectedIds]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiHealth
          color={isContextOn ? 'success' : 'subdued'}
          textSize="s"
          data-test-subj={`agentBuilderContextStatus-${isContextOn ? 'on' : 'off'}`}
        >
          {isContextOn ? labels.aiIndices.contextOn : labels.aiIndices.contextOff}
        </EuiHealth>
      </EuiFlexItem>

      {inheritedIds.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={labels.aiIndices.defaultIndicesLabel}
            helpText={labels.aiIndices.defaultIndicesHelpText}
            fullWidth
          >
            <EuiBadgeGroup gutterSize="s" role="list" data-test-subj="agentBuilderDefaultAiIndices">
              {inheritedIds.map((id) => (
                <EuiBadge
                  key={id}
                  color="hollow"
                  role="listitem"
                  data-test-subj={`agentBuilderDefaultAiIndex-${id}`}
                >
                  {labels.aiIndices.defaultIndexBadge(id)}
                </EuiBadge>
              ))}
            </EuiBadgeGroup>
          </EuiFormRow>
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiFormRow
          label={labels.aiIndices.additionalIndicesLabel}
          labelAppend={
            <EuiText size="xs" color="subdued">
              {labels.aiIndices.optionalLabel}
            </EuiText>
          }
          fullWidth
        >
          <EuiInputPopover
            fullWidth
            panelPaddingSize="none"
            isOpen={isOpen}
            closePopover={() => setIsOpen(false)}
            input={
              <EuiFormControlLayout
                isDropdown
                fullWidth
                isLoading={isLoading}
                isDisabled={isFormDisabled}
                clear={
                  selectedIds.length > 0 && !isFormDisabled
                    ? { onClick: () => onChange([]) }
                    : undefined
                }
              >
                <EuiFlexGroup
                  responsive={false}
                  alignItems="center"
                  gutterSize="xs"
                  wrap
                  css={selectedIdsFieldStyles}
                >
                  {selectedIds.map((id) => (
                    <EuiFlexItem key={id} grow={false}>
                      <EuiBadge
                        color="hollow"
                        iconType="cross"
                        iconSide="right"
                        iconOnClick={() => handleRemove(id)}
                        iconOnClickAriaLabel={labels.aiIndices.removeAiIndex(id)}
                        data-test-subj={`agentBuilderSelectedAiIndex-${id}`}
                      >
                        {id}
                      </EuiBadge>
                    </EuiFlexItem>
                  ))}
                  {/* Sibling of the badges rather than their parent, so the remove buttons are
                      never nested inside another button. */}
                  <EuiFlexItem>
                    <button
                      type="button"
                      onClick={() => setIsOpen((open) => !open)}
                      disabled={isFormDisabled}
                      aria-expanded={isOpen}
                      aria-label={labels.aiIndices.additionalIndicesLabel}
                      css={openButtonStyles}
                      data-test-subj="agentBuilderAdditionalAiIndicesButton"
                    >
                      {selectedIds.length === 0
                        ? labels.aiIndices.additionalIndicesPlaceholder
                        : ''}
                    </button>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormControlLayout>
            }
          >
            <EuiSelectable
              aria-label={labels.aiIndices.additionalIndicesLabel}
              options={options}
              onChange={handleSelectableChange}
              searchable
              searchProps={{
                placeholder: labels.aiIndices.searchPlaceholder,
                compressed: true,
              }}
              emptyMessage={labels.aiIndices.noAiIndicesMessage}
              data-test-subj="agentBuilderAdditionalAiIndicesSelectable"
            >
              {(list, search) => (
                <>
                  {search}
                  {list}
                </>
              )}
            </EuiSelectable>
          </EuiInputPopover>
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
