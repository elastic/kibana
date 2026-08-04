import React from 'react';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type { AddLayerFunction, VisualizationLayerDescription } from '@kbn/lens-common';
import type { ExtraAppendLayerArg } from './visualization';
import type { XYVisualizationState } from './types';
export interface AddLayerButtonProps {
    state: XYVisualizationState;
    supportedLayers: VisualizationLayerDescription[];
    addLayer: AddLayerFunction<ExtraAppendLayerArg>;
    eventAnnotationService: EventAnnotationServiceType;
    isInlineEditing?: boolean;
}
export declare enum AddLayerPanelType {
    main = "main",
    selectAnnotationMethod = "selectAnnotationMethod",
    compatibleVisualizationTypes = "compatibleVisualizationTypes"
}
export declare function AddLayerButton({ state, supportedLayers, addLayer, eventAnnotationService, isInlineEditing, }: AddLayerButtonProps): React.JSX.Element;
