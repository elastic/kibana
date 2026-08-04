/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { FIELD_TYPE_TITLES } from '../../templates_v2/utils/field_type_titles';
import { FieldDefinitionActions } from './field_definition_actions';
import * as i18n from '../translations';

interface FieldDefinitionRowProps {
  fieldDefinition: FieldDefinition;
  inlineField?: InlineField;
  onEdit: (fieldDefinition: FieldDefinition) => void;
  onDelete: (fieldDefinition: FieldDefinition) => void;
  /** Drag handle props from EuiDraggable. Omitted for rows that carry no order. */
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isMoveDisabled?: boolean;
}

/**
 * The single row presentation for a field definition, used by both library groups.
 *
 * Both groups list the same kind of thing, so they use the same row — the ordered group simply
 * gains a drag handle. Rendering one group as cards and the other as a data table made a single
 * page look like two products and left the unordered fields feeling like an afterthought.
 */
export const FieldDefinitionRow: React.FC<FieldDefinitionRowProps> = ({
  fieldDefinition,
  inlineField,
  onEdit,
  onDelete,
  dragHandleProps,
  onMoveUp,
  onMoveDown,
  isMoveDisabled,
}) => {
  const { euiTheme } = useEuiTheme();

  const styles = useMemo(
    () => ({
      row: css`
        /* The handle is subdued until the row is engaged: on a settled list the field names should
           carry the page, not a column of identical grab icons. */
        .fieldLibraryDragHandle {
          display: flex;
          color: ${euiTheme.colors.textSubdued};
          opacity: 0.4;
          transition: opacity ${euiTheme.animation.fast};
        }

        &:hover .fieldLibraryDragHandle,
        &:focus-within .fieldLibraryDragHandle {
          opacity: 1;
        }

        &:has(.fieldLibraryRowButton:hover),
        &:has(.fieldLibraryRowButton:focus-visible) {
          background: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }
      `,
      // The card is the edit control. Only the middle region is the button, so the drag handle and
      // the actions menu keep their own hit areas and stay valid, non-nested controls.
      rowButton: css`
        display: block;
        inline-size: 100%;
        padding: 0;
        border: none;
        background: none;
        text-align: start;
        color: inherit;
        cursor: pointer;
      `,
      name: css`
        font-family: ${euiTheme.font.familyCode};
      `,
    }),
    [euiTheme]
  );

  const isRequired = inlineField?.validation?.required === true;
  const isRequiredOnClose = inlineField?.validation?.required_on_close === true;
  const controlTitle = inlineField?.control ? FIELD_TYPE_TITLES[inlineField.control] : undefined;

  return (
    <EuiPanel
      hasBorder
      paddingSize="s"
      css={styles.row}
      data-test-subj={`fieldDefinitionRow-${fieldDefinition.name}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        {dragHandleProps ? (
          <EuiFlexItem grow={false}>
            <div
              {...dragHandleProps}
              className="fieldLibraryDragHandle"
              aria-label={i18n.REORDER_FIELD_HANDLE(fieldDefinition.name)}
              data-test-subj={`fieldDefinitionDragHandle-${fieldDefinition.name}`}
            >
              <EuiIcon type="grabOmnidirectional" aria-hidden={true} />
            </div>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <button
            type="button"
            className="fieldLibraryRowButton"
            css={styles.rowButton}
            onClick={() => onEdit(fieldDefinition)}
            aria-label={i18n.EDIT_FIELD_DEFINITION_NAMED(fieldDefinition.name)}
            data-test-subj={`fieldDefinitionRowButton-${fieldDefinition.name}`}
          >
            <EuiText size="s">
              <strong>{inlineField?.label ?? fieldDefinition.name}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued" css={styles.name}>
              {fieldDefinition.name}
            </EuiText>
            {fieldDefinition.description ? (
              <EuiText size="xs" color="subdued" data-test-subj="fieldDefinitionDescription">
                {fieldDefinition.description}
              </EuiText>
            ) : null}
          </button>
        </EuiFlexItem>
        {/* The right of the row carries the field's type and obligations rather than empty space,
            so a scan down the column answers "what kind of field is this" without opening it. */}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap>
            {isRequired ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="fieldDefinitionRequiredBadge">
                  {i18n.REQUIRED_BADGE}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            {isRequiredOnClose ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="fieldDefinitionRequiredOnCloseBadge">
                  {i18n.REQUIRED_ON_CLOSE_BADGE}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            {controlTitle ? (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued" data-test-subj="fieldDefinitionControlType">
                  {controlTitle}
                </EuiText>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FieldDefinitionActions
            fieldDefinition={fieldDefinition}
            onEdit={onEdit}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            isMoveDisabled={isMoveDisabled}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

FieldDefinitionRow.displayName = 'FieldDefinitionRow';
