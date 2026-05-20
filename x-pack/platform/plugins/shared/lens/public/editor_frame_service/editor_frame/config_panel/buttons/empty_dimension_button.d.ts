import React from 'react';
import type { DragDropIdentifier, DropType } from '@kbn/dom-drag-drop';
import type { Datasource, VisualizationDimensionGroupConfig, DatasourceLayers, IndexPatternMap, DragDropOperation, Visualization } from '@kbn/lens-common';
export declare function EmptyDimensionButton({ group, layerDatasource, state, onClick, onDrop, datasourceLayers, indexPatterns, activeVisualization, order, target, isInlineEditing, }: {
    order: [2, number, number, number];
    group: VisualizationDimensionGroupConfig;
    layerDatasource?: Datasource<unknown, unknown>;
    datasourceLayers: DatasourceLayers;
    state: unknown;
    onDrop: (source: DragDropIdentifier, dropTarget: DragDropIdentifier, dropType?: DropType) => void;
    onClick: (id: string) => void;
    indexPatterns: IndexPatternMap;
    activeVisualization: Visualization<unknown, unknown>;
    target: Omit<DragDropOperation, 'columnId'> & {
        humanData: {
            groupLabel: string;
            position: number;
            layerNumber: number;
            label: string;
        };
    };
    isInlineEditing: boolean;
}): React.JSX.Element;
