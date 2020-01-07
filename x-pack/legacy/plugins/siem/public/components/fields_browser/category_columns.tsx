/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import {
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React, { useContext } from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { getColumnsWithTimestamp } from '../event_details/helpers';
import { CountBadge } from '../page';
import { OnUpdateColumns } from '../timeline/events';
import { TimelineContext } from '../timeline/timeline_context';
import { WithHoverActions } from '../with_hover_actions';
import { LoadingSpinner, getCategoryPaneCategoryClassName, getFieldCount } from './helpers';
import * as i18n from './translations';

const CategoryName = styled.span<{ bold: boolean }>`
  .euiText {
    font-weight: ${({ bold }) => (bold ? 'bold' : 'normal')};
  }
`;

CategoryName.displayName = 'CategoryName';

const HoverActionsContainer = styled(EuiPanel)`
  cursor: default;
  left: 5px;
  padding: 8px;
  position: absolute;
  top: -8px;
`;

HoverActionsContainer.displayName = 'HoverActionsContainer';

const HoverActionsFlexGroup = styled(EuiFlexGroup)`
  cursor: pointer;
`;

HoverActionsFlexGroup.displayName = 'HoverActionsFlexGroup';

const LinkContainer = styled.div`
  width: 100%;
  .euiLink {
    width: 100%;
  }
`;

LinkContainer.displayName = 'LinkContainer';

export interface CategoryItem {
  categoryId: string;
}

interface ToolTipProps {
  categoryId: string;
  browserFields: BrowserFields;
  onUpdateColumns: OnUpdateColumns;
}

const ToolTip = React.memo<ToolTipProps>(({ categoryId, browserFields, onUpdateColumns }) => {
  const isLoading = useContext(TimelineContext);
  return (
    <EuiToolTip content={i18n.VIEW_CATEGORY(categoryId)}>
      {!isLoading ? (
        <EuiIcon
          aria-label={i18n.VIEW_CATEGORY(categoryId)}
          color="text"
          type="visTable"
          onClick={() => {
            onUpdateColumns(
              getColumnsWithTimestamp({
                browserFields,
                category: categoryId,
              })
            );
          }}
        />
      ) : (
        <LoadingSpinner size="m" />
      )}
    </EuiToolTip>
  );
});

ToolTip.displayName = 'ToolTip';

/**
 * Returns the column definition for the (single) column that displays all the
 * category names in the field browser */
export const getCategoryColumns = ({
  browserFields,
  filteredBrowserFields,
  onCategorySelected,
  onUpdateColumns,
  selectedCategoryId,
  timelineId,
}: {
  browserFields: BrowserFields;
  filteredBrowserFields: BrowserFields;
  onCategorySelected: (categoryId: string) => void;
  onUpdateColumns: OnUpdateColumns;
  selectedCategoryId: string;
  timelineId: string;
}) => [
  {
    field: 'categoryId',
    name: '',
    sortable: true,
    truncateText: false,
    render: (categoryId: string, _: { categoryId: string }) => (
      <LinkContainer>
        <EuiLink data-test-subj="category-link" onClick={() => onCategorySelected(categoryId)}>
          <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <WithHoverActions
                hoverContent={
                  <HoverActionsContainer
                    data-test-subj="hover-actions-container"
                    paddingSize="none"
                  >
                    <HoverActionsFlexGroup
                      alignItems="center"
                      direction="row"
                      gutterSize="none"
                      justifyContent="spaceBetween"
                    >
                      <EuiFlexItem grow={false}>
                        <ToolTip
                          browserFields={browserFields}
                          categoryId={categoryId}
                          onUpdateColumns={onUpdateColumns}
                        />
                      </EuiFlexItem>
                    </HoverActionsFlexGroup>
                  </HoverActionsContainer>
                }
                render={() => (
                  <CategoryName
                    bold={categoryId === selectedCategoryId}
                    className={getCategoryPaneCategoryClassName({
                      categoryId,
                      timelineId,
                    })}
                  >
                    <EuiText size="xs">{categoryId}</EuiText>
                  </CategoryName>
                )}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <CountBadge color="hollow" data-test-subj={`${categoryId}-category-count`}>
                {getFieldCount(filteredBrowserFields[categoryId])}
              </CountBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiLink>
      </LinkContainer>
    ),
  },
];
