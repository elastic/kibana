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
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiInputPopover,
  EuiSelectable,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useInheritedAiIndices } from '../../../hooks/ai_indices/use_inherited_ai_indices';
import { useListAiIndices } from '../../../hooks/ai_indices/use_list_ai_indices';
import { getActiveAiIndices } from '../../../utils/ai_indices';
import { labels } from '../../../utils/i18n';

/**
 * Loads what an agent retrieves from: the AI indices it can be assigned, and the ones its type
 * contributes. `agentId` is undefined while creating an agent, which inherits nothing until saved.
 */
export const useAiIndices = (agentId?: string) => {
  const { aiIndices, isLoading } = useListAiIndices();
  const { inheritedAiIndicesByAgentId } = useInheritedAiIndices();

  const inheritedIds = useMemo(
    () => (agentId ? inheritedAiIndicesByAgentId[agentId] ?? [] : []),
    [agentId, inheritedAiIndicesByAgentId]
  );

  return { aiIndices, inheritedIds, isLoading };
};

/**
 * Makes the pill container read as a form control, the way `EuiComboBox` does for its own input:
 * `EuiFormControlLayout` supplies the icons and the layout, but the border and background belong to
 * the control it wraps, and there is no exported style helper to borrow.
 *
 * Uses an inset shadow rather than a border, again as EUI does, so the border cannot alter the
 * control's height.
 */
const useFieldStyles = () => {
  const { euiTheme } = useEuiTheme();
  const { forms } = euiTheme.components;

  return useMemo(() => {
    const insetBorder = (color: string, width: string | number | undefined) =>
      `box-shadow: inset 0 0 0 ${width} ${color};`;

    return {
      field: css`
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: ${euiTheme.size.xs} ${euiTheme.size.s};
        min-block-size: ${euiTheme.size.xxl};
        border: none;
        border-radius: ${euiTheme.border.radius.small};
        background-color: ${forms.background};
        ${insetBorder(forms.border, euiTheme.border.width.thin)}
        padding-block: ${euiTheme.size.s};
        padding-inline-start: ${euiTheme.size.m};
        /* The layout counts its own icons in this variable, so the pills never run under them. */
        padding-inline-end: calc(
          ${euiTheme.size.m} +
            (${euiTheme.size.base} * 1.5 * var(--euiFormControlRightIconsCount, 0))
        );

        &:hover {
          ${insetBorder(forms.borderHovered, euiTheme.border.width.thin)}
        }

        &:focus-within {
          ${insetBorder(forms.borderFocused, euiTheme.border.width.thick)}
        }
      `,
      disabled: css`
        background-color: ${forms.backgroundDisabled};
        ${insetBorder(forms.border, euiTheme.border.width.thin)}
        &:hover {
          ${insetBorder(forms.border, euiTheme.border.width.thin)}
        }
      `,
      /** Fills the rest of the control, so clicking its empty space opens the list. */
      openButton: css`
        flex-grow: 1;
        align-self: stretch;
        text-align: start;
        cursor: pointer;

        &:disabled {
          cursor: not-allowed;
        }
      `,
    };
  }, [euiTheme, forms]);
};

export interface AiIndicesFieldsProps {
  aiIndices: Array<{ id: string; description?: string; managed: boolean }>;
  /** AI indices assigned to the agent itself: editable, and the only ones a change writes back. */
  assignedIds: string[];
  /** AI indices contributed by the agent's type. They always apply and cannot be removed here. */
  inheritedIds: string[];
  isLoading: boolean;
  isFormDisabled: boolean;
  onChange: (assignedIds: string[]) => void;
  /** The flyout states Context on/off in its own summary, so it hides this one. */
  showStatus?: boolean;
}

export const AiIndicesFields: React.FC<AiIndicesFieldsProps> = ({
  aiIndices,
  assignedIds,
  inheritedIds,
  isLoading,
  isFormDisabled,
  onChange,
  showStatus = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const fieldStyles = useFieldStyles();

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
      {showStatus && (
        <EuiFlexItem grow={false}>
          <EuiHealth
            color={isContextOn ? 'success' : 'subdued'}
            textSize="s"
            data-test-subj={`agentBuilderContextStatus-${isContextOn ? 'on' : 'off'}`}
          >
            {isContextOn ? labels.aiIndices.contextOn : labels.aiIndices.contextOff}
          </EuiHealth>
        </EuiFlexItem>
      )}

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
                wrapperProps={{
                  css: [fieldStyles.field, isFormDisabled && fieldStyles.disabled],
                }}
                clear={
                  selectedIds.length > 0 && !isFormDisabled
                    ? { onClick: () => onChange([]) }
                    : undefined
                }
              >
                <>
                  {selectedIds.map((id) => (
                    <EuiBadge
                      key={id}
                      color="hollow"
                      iconType="cross"
                      iconSide="right"
                      iconOnClick={() => handleRemove(id)}
                      iconOnClickAriaLabel={labels.aiIndices.removeAiIndex(id)}
                      data-test-subj={`agentBuilderSelectedAiIndex-${id}`}
                    >
                      {id}
                    </EuiBadge>
                  ))}
                  {/* Sibling of the badges rather than their parent, so the remove buttons are
                      never nested inside another button. */}
                  <button
                    type="button"
                    onClick={() => setIsOpen((open) => !open)}
                    disabled={isFormDisabled}
                    aria-expanded={isOpen}
                    aria-label={labels.aiIndices.additionalIndicesLabel}
                    css={fieldStyles.openButton}
                    data-test-subj="agentBuilderAdditionalAiIndicesButton"
                  >
                    {selectedIds.length === 0 ? labels.aiIndices.additionalIndicesPlaceholder : ''}
                  </button>
                </>
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
