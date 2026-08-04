import type { ReactElement } from 'react';
import React from 'react';
import type { DragDropIdentifier, DropType } from '@kbn/dom-drag-drop';
import type { Datasource, VisualizationDimensionGroupConfig, DatasourceLayers, IndexPatternMap, DragDropOperation, Visualization } from '@kbn/lens-common';
export declare function DraggableDimensionButton({ order, group, onDrop, activeVisualization, onDragStart, onDragEnd, children, state, layerDatasource, datasourceLayers, registerNewButtonRef, indexPatterns, target, }: {
    target: DragDropOperation & {
        id: string;
        humanData: {
            label: string;
            groupLabel: string;
            position: number;
            layerNumber: number;
        };
    };
    order: [2, number, number, number];
    onDrop: (source: DragDropIdentifier, dropTarget: DragDropIdentifier, dropType?: DropType) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    activeVisualization: Visualization<unknown, unknown>;
    group: VisualizationDimensionGroupConfig;
    children: ReactElement;
    layerDatasource?: Datasource<unknown, unknown>;
    datasourceLayers: DatasourceLayers;
    state: unknown;
    registerNewButtonRef: (id: string, instance: HTMLDivElement | null) => void;
    indexPatterns: IndexPatternMap;
}): React.JSX.Element;
