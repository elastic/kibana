/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCheckbox, EuiIcon, EuiToolTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { uniqBy } from 'lodash/fp';
import * as React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import styled from 'styled-components';

import { BrowserField, BrowserFields } from '../../containers/source';
import { DraggableFieldBadge } from '../draggables/field_badge';
import { DragEffects } from '../drag_and_drop/draggable_wrapper';
import { DroppableWrapper } from '../drag_and_drop/droppable_wrapper';
import { getColumnsWithTimestamp, getExampleText, getIconFromType } from '../event_details/helpers';
import { getDraggableFieldId, getDroppableId, DRAG_TYPE_FIELD } from '../drag_and_drop/helpers';
import { getEmptyValue } from '../empty_value';
import { OnUpdateColumns } from '../timeline/events';
import { SelectableText } from '../selectable_text';
import { TruncatableText } from '../truncatable_text';

import { FieldName } from './field_name';

import * as i18n from './translations';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../timeline/body/helpers';
import { defaultColumnHeaderType } from '../timeline/body/column_headers/default_headers';

const TypeIcon = styled(EuiIcon)`
  margin-left: 5px;
  position: relative;
  top: -1px;
`;

/**
 * An item rendered in the table
 */
export interface FieldItem {
  description: React.ReactNode;
  field: React.ReactNode;
  fieldId: string;
}

/**
 * Returns the draggable fields, values, and descriptions shown when a user expands an event
 */
export const getFieldItems = ({
  browserFields,
  category,
  categoryId,
  columnHeaders,
  highlight = '',
  isLoading,
  onUpdateColumns,
  timelineId,
  toggleColumn,
}: {
  browserFields: BrowserFields;
  category: Partial<BrowserField>;
  categoryId: string;
  columnHeaders: ColumnHeader[];
  highlight?: string;
  isLoading: boolean;
  timelineId: string;
  toggleColumn: (column: ColumnHeader) => void;
  onUpdateColumns: OnUpdateColumns;
}): FieldItem[] =>
  uniqBy('name', [
    ...Object.values(category != null && category.fields != null ? category.fields : {}),
  ]).map(field => ({
    description: (
      <SelectableText>
        {`${field.description || getEmptyValue()} ${getExampleText(field.example)}`}{' '}
      </SelectableText>
    ),
    field: (
      <DroppableWrapper
        droppableId={getDroppableId(
          `field-browser-field-${categoryId}-${field.name}-${timelineId}`
        )}
        key={`${categoryId}-${field.name}-${timelineId}`}
        isDropDisabled={true}
        type={DRAG_TYPE_FIELD}
      >
        <Draggable
          draggableId={getDraggableFieldId({
            contextId: `field-browser-category-${categoryId}-field-${field.name}-${timelineId}`,
            fieldId: field.name || '',
          })}
          index={0}
          type={DRAG_TYPE_FIELD}
        >
          {(provided, snapshot) => (
            <div
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              ref={provided.innerRef}
              style={{
                ...provided.draggableProps.style,
                zIndex: 9999,
              }}
            >
              {!snapshot.isDragging ? (
                <EuiFlexGroup alignItems="center" gutterSize="none">
                  <EuiFlexItem grow={false}>
                    <EuiCheckbox
                      checked={columnHeaders.findIndex(c => c.id === field.name) !== -1}
                      id={field.name || ''}
                      onChange={() =>
                        toggleColumn({
                          columnHeaderType: defaultColumnHeaderType,
                          id: field.name || '',
                          width: DEFAULT_COLUMN_MIN_WIDTH,
                        })
                      }
                    />
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    <EuiToolTip content={field.type}>
                      <TypeIcon type={getIconFromType(field.type || '')} />
                    </EuiToolTip>
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    <FieldName
                      categoryId={field.category || categoryId}
                      categoryColumns={getColumnsWithTimestamp({
                        browserFields,
                        category: field.category || categoryId,
                      })}
                      fieldId={field.name || ''}
                      highlight={highlight}
                      isLoading={isLoading}
                      onUpdateColumns={onUpdateColumns}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                <DragEffects>
                  <DraggableFieldBadge fieldId={field.name || ''} />
                </DragEffects>
              )}
            </div>
          )}
        </Draggable>
      </DroppableWrapper>
    ),
    fieldId: field.name || '',
  }));

/**
 * Returns a table column template provided to the `EuiInMemoryTable`'s
 * `columns` prop
 */
export const getFieldColumns = () => [
  {
    field: 'field',
    name: i18n.FIELD,
    sortable: true,
    render: (field: React.ReactNode) => <>{field}</>,
    width: '250px',
  },
  {
    field: 'description',
    name: i18n.DESCRIPTION,
    render: (description: string) => (
      <EuiToolTip position="top" content={description}>
        <TruncatableText size="s" width="300px">
          {description}
        </TruncatableText>
      </EuiToolTip>
    ),
    sortable: true,
    truncateText: true,
    width: '400px',
  },
];
