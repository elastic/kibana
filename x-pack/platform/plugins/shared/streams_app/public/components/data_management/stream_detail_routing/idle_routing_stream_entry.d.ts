import React from 'react';
import type { DraggableProvided } from '@hello-pangea/dnd';
import type { RoutingDefinitionWithUIAttributes } from './types';
export declare function IdleRoutingStreamEntry({ availableStreams, draggableProvided, isEditingEnabled, onEditClick, routingRule, canReorder, }: {
    availableStreams: string[];
    draggableProvided: DraggableProvided;
    isEditingEnabled: boolean;
    onEditClick: (id: string) => void;
    routingRule: RoutingDefinitionWithUIAttributes;
    canReorder: boolean;
}): React.JSX.Element;
