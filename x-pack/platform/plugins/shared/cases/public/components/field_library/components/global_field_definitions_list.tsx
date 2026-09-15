/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiLink,
  EuiScreenReaderOnly,
  EuiText,
  euiDragDropReorder,
} from '@elastic/eui';
import type { DropResult } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { FieldDefinitionRow } from './field_definition_row';
import { FieldDefinitionRowHeader } from './field_definition_row_header';
import * as i18n from '../translations';

interface GlobalFieldDefinitionsListProps {
  fieldDefinitions: FieldDefinition[];
  parseInlineField: (definition: string) => InlineField | undefined;
  onReorder: (fieldDefinitions: FieldDefinition[]) => void;
  onEdit: (fieldDefinition: FieldDefinition) => void;
  onDelete: (fieldDefinition: FieldDefinition) => void;
  /** Opens the create field definition flyout; the empty state links to it. */
  onCreateFieldDefinition: () => void;
  /** True once a reorder write has failed, so the optimistic order can roll back to the server's. */
  hasReorderFailed: boolean;
}

export const GlobalFieldDefinitionsList: React.FC<GlobalFieldDefinitionsListProps> = ({
  fieldDefinitions,
  parseInlineField,
  onReorder,
  onEdit,
  onDelete,
  onCreateFieldDefinition,
  hasReorderFailed,
}) => {
  const [announcement, setAnnouncement] = useState('');

  // The server round-trip takes long enough that rendering from the query result alone made a drop
  // snap back to the old order and then jump to the new one. The pending order is shown immediately
  // and held until the refetched data agrees with it, so the list only ever moves once.
  const [pendingOrder, setPendingOrder] = useState<FieldDefinition[] | undefined>();
  const serverOrderKey = fieldDefinitions.map(({ fieldDefinitionId }) => fieldDefinitionId).join();
  const pendingOrderKey = pendingOrder?.map(({ fieldDefinitionId }) => fieldDefinitionId).join();

  // Drop the optimistic order once the server agrees with it, and also when the write failed —
  // otherwise a failed reorder leaves the list showing an order that was never persisted, and the
  // error toast is the only hint that what is on screen is a lie.
  if (pendingOrder && (pendingOrderKey === serverOrderKey || hasReorderFailed)) {
    setPendingOrder(undefined);
  }

  const orderedFieldDefinitions =
    pendingOrder && pendingOrder.length === fieldDefinitions.length
      ? pendingOrder
      : fieldDefinitions;

  const move = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= orderedFieldDefinitions.length) {
        return;
      }
      const reordered = euiDragDropReorder(orderedFieldDefinitions, from, to);
      setPendingOrder(reordered);
      setAnnouncement(i18n.FIELD_MOVED_ANNOUNCEMENT(reordered[to].name, to + 1, reordered.length));
      onReorder(reordered);
    },
    [orderedFieldDefinitions, onReorder]
  );

  const onDragEnd = useCallback(
    ({ source, destination }: DropResult) => {
      if (destination) {
        move(source.index, destination.index);
      }
    },
    [move]
  );

  if (orderedFieldDefinitions.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="globalFieldDefinitionsEmpty">
        <p>
          <FormattedMessage
            id="xpack.cases.fieldLibrary.globalFieldsSectionEmpty"
            defaultMessage="No global fields yet. Enable the Global field setting when you {createOrEditLink}."
            values={{
              createOrEditLink: (
                <EuiLink
                  onClick={onCreateFieldDefinition}
                  data-test-subj="globalFieldDefinitionsEmptyCreateLink"
                >
                  {i18n.GLOBAL_FIELDS_SECTION_EMPTY_LINK}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
    );
  }

  return (
    <>
      {/* Dragging is not perceivable to a screen reader, so every move — pointer or keyboard — is
          narrated with the resulting position. */}
      <EuiScreenReaderOnly>
        <div aria-live="polite" role="status">
          {announcement}
        </div>
      </EuiScreenReaderOnly>
      <FieldDefinitionRowHeader />
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiDroppable
          droppableId="globalFieldDefinitions"
          spacing="none"
          data-test-subj="globalFieldDefinitionsDroppable"
        >
          {orderedFieldDefinitions.map((fieldDefinition, index) => (
            <EuiDraggable
              key={fieldDefinition.fieldDefinitionId}
              index={index}
              draggableId={fieldDefinition.fieldDefinitionId}
              customDragHandle
              hasInteractiveChildren
              spacing="none"
            >
              {(provided) => (
                <FieldDefinitionRow
                  fieldDefinition={fieldDefinition}
                  inlineField={parseInlineField(fieldDefinition.definition)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  dragHandleProps={provided.dragHandleProps}
                  isFirst={index === 0}
                  onMoveUp={index > 0 ? () => move(index, index - 1) : undefined}
                  onMoveDown={
                    index < orderedFieldDefinitions.length - 1
                      ? () => move(index, index + 1)
                      : undefined
                  }
                />
              )}
            </EuiDraggable>
          ))}
        </EuiDroppable>
      </EuiDragDropContext>
    </>
  );
};

GlobalFieldDefinitionsList.displayName = 'GlobalFieldDefinitionsList';
