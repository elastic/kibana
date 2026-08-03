import React from 'react';
import type { VisualizationToolbarProps } from '@kbn/lens-common';
export interface ToolbarContentMap<S> {
    style?: React.ComponentType<VisualizationToolbarProps<S>>;
    legend?: React.ComponentType<VisualizationToolbarProps<S>>;
    filters?: React.ComponentType<VisualizationToolbarProps<S>>;
}
export declare function FlyoutToolbar<S>({ contentMap, isInlineEditing, ...flyoutContentProps }: VisualizationToolbarProps<S> & {
    contentMap: ToolbarContentMap<S>;
    isInlineEditing: boolean;
}): React.JSX.Element;
