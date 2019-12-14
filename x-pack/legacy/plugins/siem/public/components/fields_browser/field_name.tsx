/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  // @ts-ignore
  EuiHighlight,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React, { useContext } from 'react';
import styled from 'styled-components';

import { WithCopyToClipboard } from '../../lib/clipboard/with_copy_to_clipboard';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { OnUpdateColumns } from '../timeline/events';
import { TimelineContext } from '../timeline/timeline_context';
import { WithHoverActions } from '../with_hover_actions';
import { LoadingSpinner } from './helpers';
import * as i18n from './translations';

/**
 * The name of a (draggable) field
 */
export const FieldNameContainer = styled.span`
  ${({ theme }) => `
    border-radius: 4px;
    padding: 0 4px 0 8px;
    position: relative;

    &::before {
      background-image: linear-gradient(135deg, ${theme.eui.euiColorMediumShade} 25%, transparent 25%),
        linear-gradient(-135deg, ${theme.eui.euiColorMediumShade} 25%, transparent 25%),
        linear-gradient(135deg, transparent 75%, ${theme.eui.euiColorMediumShade} 75%),
        linear-gradient(-135deg, transparent 75%, ${theme.eui.euiColorMediumShade} 75%);
      background-position: 0 0, 1px 0, 1px -1px, 0px 1px;
      background-size: 2px 2px;
      bottom: 2px;
      content: '';
      display: block;
      left: 2px;
      position: absolute;
      top: 2px;
      width: 4px;
    }

    &:hover,
    &:focus {
      transition: background-color 0.7s ease;
      background-color: #000;
      color: #fff;

      &::before {
        background-image: linear-gradient(135deg, #fff 25%, transparent 25%),
          linear-gradient(-135deg, ${theme.eui.euiColorLightestShade} 25%, transparent 25%),
          linear-gradient(135deg, transparent 75%, ${theme.eui.euiColorLightestShade} 75%),
          linear-gradient(-135deg, transparent 75%, ${theme.eui.euiColorLightestShade} 75%);
      }
    }
  `}
`;

FieldNameContainer.displayName = 'FieldNameContainer';

const HoverActionsContainer = styled(EuiPanel)`
  cursor: default;
  left: 5px;
  padding: 4px;
  position: absolute;
  top: -6px;
`;

HoverActionsContainer.displayName = 'HoverActionsContainer';

const HoverActionsFlexGroup = styled(EuiFlexGroup)`
  cursor: pointer;
`;

HoverActionsFlexGroup.displayName = 'HoverActionsFlexGroup';

const ViewCategoryIcon = styled(EuiIcon)`
  margin-left: 5px;
`;

ViewCategoryIcon.displayName = 'ViewCategoryIcon';

interface ToolTipProps {
  categoryId: string;
  onUpdateColumns: OnUpdateColumns;
  categoryColumns: ColumnHeader[];
}

const ViewCategory = React.memo<ToolTipProps>(
  ({ categoryId, onUpdateColumns, categoryColumns }) => {
    const isLoading = useContext(TimelineContext);
    return (
      <EuiToolTip content={i18n.VIEW_CATEGORY(categoryId)}>
        {!isLoading ? (
          <EuiButtonIcon
            aria-label={i18n.VIEW_CATEGORY(categoryId)}
            color="text"
            data-test-subj="view-category"
            onClick={() => {
              onUpdateColumns(categoryColumns);
            }}
            iconType="visTable"
          />
        ) : (
          <LoadingSpinner size="m" />
        )}
      </EuiToolTip>
    );
  }
);

ViewCategory.displayName = 'ViewCategory';

/** Renders a field name in it's non-dragging state */
export const FieldName = React.memo<{
  categoryId: string;
  categoryColumns: ColumnHeader[];
  fieldId: string;
  highlight?: string;
  onUpdateColumns: OnUpdateColumns;
}>(({ categoryId, categoryColumns, fieldId, highlight = '', onUpdateColumns }) => (
  <WithHoverActions
    hoverContent={
      <HoverActionsContainer data-test-subj="hover-actions-container" paddingSize="none">
        <HoverActionsFlexGroup
          alignItems="center"
          direction="row"
          gutterSize="none"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.COPY_TO_CLIPBOARD}>
              <WithCopyToClipboard
                data-test-subj="copy-to-clipboard"
                text={fieldId}
                titleSummary={i18n.FIELD}
              />
            </EuiToolTip>
          </EuiFlexItem>

          {categoryColumns.length > 0 && (
            <EuiFlexItem grow={false}>
              <ViewCategory
                categoryId={categoryId}
                categoryColumns={categoryColumns}
                onUpdateColumns={onUpdateColumns}
              />
            </EuiFlexItem>
          )}
        </HoverActionsFlexGroup>
      </HoverActionsContainer>
    }
    render={() => (
      <FieldNameContainer>
        <EuiText size="xs">
          <EuiHighlight data-test-subj={`field-name-${fieldId}`} search={highlight}>
            {fieldId}
          </EuiHighlight>
        </EuiText>
      </FieldNameContainer>
    )}
  />
));

FieldName.displayName = 'FieldName';
