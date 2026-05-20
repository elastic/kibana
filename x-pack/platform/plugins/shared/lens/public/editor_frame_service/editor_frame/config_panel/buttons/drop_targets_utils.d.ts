import type { DragDropIdentifier, DropType } from '@kbn/dom-drag-drop';
import type { FramePublicAPI, Visualization, DragDropOperation, VisualizationDimensionGroupConfig } from '@kbn/lens-common';
export interface OnVisDropProps<T> {
    prevState: T;
    target: DragDropOperation;
    source: DragDropIdentifier;
    frame: FramePublicAPI;
    dropType: DropType;
    group?: VisualizationDimensionGroupConfig;
}
export declare function onDropForVisualization<T, P = unknown, E = unknown>(props: OnVisDropProps<T>, activeVisualization: Visualization<T, P, E>): T;
