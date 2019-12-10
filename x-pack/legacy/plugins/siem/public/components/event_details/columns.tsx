/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import * as React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { ToStringArray } from '../../graphql/types';
import { WithCopyToClipboard } from '../../lib/clipboard/with_copy_to_clipboard';
import { DragEffects } from '../drag_and_drop/draggable_wrapper';
import { DroppableWrapper } from '../drag_and_drop/droppable_wrapper';
import { getDroppableId, getDraggableFieldId, DRAG_TYPE_FIELD } from '../drag_and_drop/helpers';
import { DraggableFieldBadge } from '../draggables/field_badge';
import { FieldName } from '../fields_browser/field_name';
import { SelectableText } from '../selectable_text';
import { OverflowField } from '../tables/helpers';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { defaultColumnHeaderType } from '../timeline/body/column_headers/default_headers';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../timeline/body/helpers';
import { MESSAGE_FIELD_NAME } from '../timeline/body/renderers/constants';
import { FormattedFieldValue } from '../timeline/body/renderers/formatted_field';
import { OnUpdateColumns } from '../timeline/events';
import { WithHoverActions } from '../with_hover_actions';
import { getIconFromType, getExampleText, getColumnsWithTimestamp } from './helpers';
import * as i18n from './translations';
import { EventFieldsData } from './types';

const HoverActionsContainer = styled(EuiPanel)`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 25px;
  justify-content: center;
  left: 5px;
  position: absolute;
  top: -10px;
  width: 30px;
`;

HoverActionsContainer.displayName = 'HoverActionsContainer';

export const getColumns = ({
  browserFields,
  columnHeaders,
  eventId,
  onUpdateColumns,
  contextId,
  toggleColumn,
}: {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeader[];
  eventId: string;
  onUpdateColumns: OnUpdateColumns;
  contextId: string;
  toggleColumn: (column: ColumnHeader) => void;
}) => [
  {
    field: 'field',
    name: '',
    sortable: false,
    truncateText: false,
    width: '30px',
    render: (field: string) => (
      <EuiToolTip content={i18n.TOGGLE_COLUMN_TOOLTIP}>
        <EuiCheckbox
          checked={columnHeaders.findIndex(c => c.id === field) !== -1}
          data-test-subj={`toggle-field-${field}`}
          id={field}
          onChange={() =>
            toggleColumn({
              columnHeaderType: defaultColumnHeaderType,
              id: field,
              width: DEFAULT_COLUMN_MIN_WIDTH,
            })
          }
        />
      </EuiToolTip>
    ),
  },
  {
    field: 'field',
    name: i18n.FIELD,
    sortable: true,
    truncateText: false,
    render: (field: string, data: EventFieldsData) => (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiToolTip content={data.type}>
            <EuiIcon data-test-subj="field-type-icon" type={getIconFromType(data.type)} />
          </EuiToolTip>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <DroppableWrapper
            droppableId={getDroppableId(
              `event-details-field-droppable-wrapper-${contextId}-${eventId}-${data.category}-${field}`
            )}
            key={getDroppableId(
              `event-details-field-droppable-wrapper-${contextId}-${eventId}-${data.category}-${field}`
            )}
            isDropDisabled={true}
            type={DRAG_TYPE_FIELD}
          >
            <Draggable
              draggableId={getDraggableFieldId({
                contextId: `event-details-field-draggable-${contextId}-${eventId}-${data.category}-${field}`,
                fieldId: field,
              })}
              index={0}
              type={DRAG_TYPE_FIELD}
            >
              {(provided, snapshot) => (
                <div
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  ref={provided.innerRef}
                >
                  {!snapshot.isDragging ? (
                    <FieldName
                      categoryId={data.category}
                      categoryColumns={getColumnsWithTimestamp({
                        browserFields,
                        category: data.category,
                      })}
                      data-test-subj="field-name"
                      fieldId={field}
                      onUpdateColumns={onUpdateColumns}
                    />
                  ) : (
                    <DragEffects>
                      <DraggableFieldBadge fieldId={field} />
                    </DragEffects>
                  )}
                </div>
              )}
            </Draggable>
          </DroppableWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    field: 'values',
    name: i18n.VALUE,
    sortable: true,
    truncateText: false,
    render: (values: ToStringArray | null | undefined, data: EventFieldsData) => (
      <EuiFlexGroup direction="column" alignItems="flexStart" component="span" gutterSize="none">
        {values != null &&
          values.map((value, i) => (
            <EuiFlexItem
              grow={false}
              component="span"
              key={`event-details-value-flex-item-${contextId}-${eventId}-${data.field}-${i}-${value}`}
            >
              <WithHoverActions
                hoverContent={
                  <HoverActionsContainer data-test-subj="hover-actions-container">
                    <EuiToolTip content={i18n.COPY_TO_CLIPBOARD}>
                      <WithCopyToClipboard text={value} titleSummary={i18n.VALUE.toLowerCase()} />
                    </EuiToolTip>
                  </HoverActionsContainer>
                }
                render={() =>
                  data.field === MESSAGE_FIELD_NAME ? (
                    <OverflowField value={value} />
                  ) : (
                    <FormattedFieldValue
                      contextId={`event-details-value-formatted-field-value-${contextId}-${eventId}-${data.field}-${i}-${value}`}
                      eventId={eventId}
                      fieldFormat={data.format}
                      fieldName={data.field}
                      fieldType={data.type}
                      value={value}
                    />
                  )
                }
              />
            </EuiFlexItem>
          ))}
      </EuiFlexGroup>
    ),
  },
  {
    field: 'description',
    name: i18n.DESCRIPTION,
    render: (description: string | null | undefined, data: EventFieldsData) => (
      <SelectableText>
        <EuiText size="xs">{`${description || ''} ${getExampleText(data.example)}`}</EuiText>
      </SelectableText>
    ),
    sortable: true,
    truncateText: true,
    width: '50%',
  },
  {
    field: 'valuesConcatenated',
    name: i18n.BLANK,
    render: () => null,
    sortable: false,
    truncateText: true,
    width: '1px',
  },
];
