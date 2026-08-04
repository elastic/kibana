/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
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
  isFirst?: boolean;
}

/**
 * One field definition, as a single dense list row shared by both library groups.
 *
 * A card per field wasted most of its width on nothing — a short field name left two thirds of the
 * row empty, and stacking name over description made every entry three lines tall for two short
 * strings. This is a fixed-column list instead: label, name, type, and obligations each own a
 * column, so values line up down the page and a scan compares like with like. The ordered group
 * adds a drag handle in the gutter; nothing else differs between the two groups.
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
  isFirst = false,
}) => {
  const { euiTheme } = useEuiTheme();

  const styles = useMemo(
    () => ({
      row: css`
        display: grid;
        /* handle | label | name | type | badges | actions */
        grid-template-columns:
          ${dragHandleProps ? euiTheme.size.l : '0'} minmax(0, 1.4fr) minmax(0, 1.6fr)
          minmax(0, 0.9fr) auto ${euiTheme.size.xl};
        align-items: center;
        gap: ${euiTheme.size.m};
        padding: ${euiTheme.size.xs} ${euiTheme.size.s};
        border-block-start: ${isFirst ? 'none' : euiTheme.border.thin};

        &:hover {
          background: ${euiTheme.colors.backgroundBaseSubdued};
        }

        /* The handle stays out of the way until the row is engaged: on a settled list the field
           names should carry the page, not a column of identical grab icons. */
        .fieldLibraryDragHandle {
          display: flex;
          color: ${euiTheme.colors.textSubdued};
          opacity: 0.35;
          transition: opacity ${euiTheme.animation.fast};
        }

        &:hover .fieldLibraryDragHandle,
        &:focus-within .fieldLibraryDragHandle {
          opacity: 1;
        }
      `,
      // The label cell is the edit control, so the row needs no separate Edit affordance. The drag
      // handle and actions menu sit outside it and keep their own hit areas.
      labelButton: css`
        min-inline-size: 0;
        padding: 0;
        border: none;
        background: none;
        text-align: start;
        cursor: pointer;
        font-weight: ${euiTheme.font.weight.semiBold};
        color: ${euiTheme.colors.textParagraph};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        &:hover,
        &:focus-visible {
          text-decoration: underline;
        }
      `,
      truncated: css`
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `,
      name: css`
        font-family: ${euiTheme.font.familyCode};
      `,
      badges: css`
        display: flex;
        gap: ${euiTheme.size.xs};
        justify-content: flex-end;
      `,
    }),
    [euiTheme, dragHandleProps, isFirst]
  );

  const isRequired = inlineField?.validation?.required === true;
  const isRequiredOnClose = inlineField?.validation?.required_on_close === true;
  const controlTitle = inlineField?.control ? FIELD_TYPE_TITLES[inlineField.control] : undefined;
  const label = inlineField?.label ?? fieldDefinition.name;
  // The description is genuinely useful but rarely short; it rides in the name column's tooltip
  // rather than claiming a third line on every row.
  const secondary = fieldDefinition.description ?? fieldDefinition.name;

  return (
    <div css={styles.row} data-test-subj={`fieldDefinitionRow-${fieldDefinition.name}`}>
      {dragHandleProps ? (
        <div
          {...dragHandleProps}
          className="fieldLibraryDragHandle"
          aria-label={i18n.REORDER_FIELD_HANDLE(fieldDefinition.name)}
          data-test-subj={`fieldDefinitionDragHandle-${fieldDefinition.name}`}
        >
          <EuiIcon type="grabOmnidirectional" size="s" aria-hidden={true} />
        </div>
      ) : (
        <span />
      )}

      <EuiText size="s" css={styles.truncated}>
        <button
          type="button"
          css={styles.labelButton}
          onClick={() => onEdit(fieldDefinition)}
          aria-label={i18n.EDIT_FIELD_DEFINITION_NAMED(fieldDefinition.name)}
          data-test-subj={`fieldDefinitionRowButton-${fieldDefinition.name}`}
          title={label}
        >
          {label}
        </button>
      </EuiText>

      <EuiText
        size="xs"
        color="subdued"
        css={[styles.truncated, fieldDefinition.description ? undefined : styles.name]}
        title={secondary}
        data-test-subj="fieldDefinitionSecondary"
      >
        {secondary}
      </EuiText>

      <EuiText size="xs" color="subdued" css={styles.truncated}>
        {controlTitle ?? ''}
      </EuiText>

      <div css={styles.badges}>
        {isRequired ? (
          <EuiBadge color="hollow" data-test-subj="fieldDefinitionRequiredBadge">
            {i18n.REQUIRED_BADGE}
          </EuiBadge>
        ) : null}
        {isRequiredOnClose ? (
          <EuiBadge color="hollow" data-test-subj="fieldDefinitionRequiredOnCloseBadge">
            {i18n.REQUIRED_ON_CLOSE_BADGE}
          </EuiBadge>
        ) : null}
      </div>

      <FieldDefinitionActions
        fieldDefinition={fieldDefinition}
        onEdit={onEdit}
        onDelete={onDelete}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        isMoveDisabled={isMoveDisabled}
      />
    </div>
  );
};

FieldDefinitionRow.displayName = 'FieldDefinitionRow';
