/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps } from 'react';
import { EuiDragDropContext, EuiDraggable, EuiDroppable, euiDragDropReorder } from '@elastic/eui';

import { ComponentTemplateListItem } from '../../../../../common';
import {
  ComponentTemplatesListItem,
  Props as ComponentTemplatesListItemProps,
} from './component_templates_list_item';

interface Props {
  components: ComponentTemplateListItem[];
  onReorder: (components: ComponentTemplateListItem[]) => void;
  listItemProps: Omit<ComponentTemplatesListItemProps, 'component'>;
}

export const ComponentTemplatesSelection = ({ components, onReorder, listItemProps }: Props) => {
  const onDragEnd: ComponentProps<typeof EuiDragDropContext>['onDragEnd'] = ({
    source,
    destination,
  }) => {
    if (source && destination) {
      const items = euiDragDropReorder(components, source.index, destination.index);
      onReorder(items);
    }
  };

  return (
    <EuiDragDropContext onDragEnd={onDragEnd}>
      <EuiDroppable droppableId="componentTemplates" spacing="none">
        {components.map((component, idx) => (
          <EuiDraggable
            spacing="none"
            key={component.name}
            index={idx}
            draggableId={component.name}
            customDragHandle={true}
          >
            {(provided) => (
              <ComponentTemplatesListItem
                component={component}
                dragHandleProps={provided.dragHandleProps}
                {...listItemProps}
              />
            )}
          </EuiDraggable>
        ))}
      </EuiDroppable>
    </EuiDragDropContext>
  );
};
