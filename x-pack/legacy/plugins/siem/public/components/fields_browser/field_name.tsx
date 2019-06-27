/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiHighlight,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiToolTip,
} from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { WithCopyToClipboard } from '../../lib/clipboard/with_copy_to_clipboard';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { OnUpdateColumns } from '../timeline/events';
import { WithHoverActions } from '../with_hover_actions';

import { LoadingSpinner } from './helpers';
import * as i18n from './translations';

/**
 * The name of a (draggable) field
 */
export const FieldNameContainer = styled.span`
  padding: 5px;
  &:hover {
    transition: background-color 0.7s ease;
    background-color: #000;
    color: #fff;
  }
`;

const HoverActionsContainer = styled(EuiPanel)`
  cursor: default;
  height: 25px;
  left: 5px;
  position: absolute;
  top: 3px;
`;

const HoverActionsFlexGroup = styled(EuiFlexGroup)`
  cursor: pointer;
  position: relative;
  top: -8px;
`;

const ViewCategoryIcon = styled(EuiIcon)`
  margin-left: 5px;
`;

/** Renders a field name in it's non-dragging state */
export const FieldName = pure<{
  categoryId: string;
  categoryColumns: ColumnHeader[];
  fieldId: string;
  highlight?: string;
  isLoading: boolean;
  onUpdateColumns: OnUpdateColumns;
}>(({ categoryId, categoryColumns, fieldId, highlight = '', isLoading, onUpdateColumns }) => (
  <WithHoverActions
    hoverContent={
      <HoverActionsContainer data-test-subj="hover-actions-container" paddingSize="s">
        <HoverActionsFlexGroup
          alignItems="center"
          direction="row"
          gutterSize="none"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.COPY_TO_CLIPBOARD}>
              <WithCopyToClipboard text={fieldId} titleSummary={i18n.FIELD} />
            </EuiToolTip>
          </EuiFlexItem>

          {categoryColumns.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.VIEW_CATEGORY(categoryId)}>
                {!isLoading ? (
                  <ViewCategoryIcon
                    aria-label={i18n.VIEW_CATEGORY(categoryId)}
                    color="text"
                    onClick={() => {
                      onUpdateColumns(categoryColumns);
                    }}
                    type="visTable"
                  />
                ) : (
                  <LoadingSpinner size="m" />
                )}
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </HoverActionsFlexGroup>
      </HoverActionsContainer>
    }
    render={() => (
      <FieldNameContainer>
        <EuiHighlight search={highlight}>{fieldId}</EuiHighlight>
      </FieldNameContainer>
    )}
  />
));
