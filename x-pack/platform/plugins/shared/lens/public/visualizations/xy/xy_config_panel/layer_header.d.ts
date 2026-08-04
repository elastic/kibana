import React from 'react';
import type { VisualizationLayerHeaderContentProps, VisualizationLayerWidgetProps } from '@kbn/lens-common';
import type { XYVisualizationState } from '../types';
export declare function LayerHeader(props: VisualizationLayerWidgetProps<XYVisualizationState>): React.JSX.Element | null;
export declare function LayerHeaderContent(props: VisualizationLayerHeaderContentProps<XYVisualizationState>): React.JSX.Element | null;
export declare function ReferenceLayerHeader(): React.JSX.Element;
export declare function AnnotationsLayerHeader({ title }: {
    title: string | undefined;
}): React.JSX.Element;
