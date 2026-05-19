import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { LayerAction, Visualization } from '@kbn/lens-common';
import type { LayerType } from '../../../..';
export interface LayerActionsProps {
    layerIndex: number;
    actions: LayerAction[];
    mountingPoint?: HTMLDivElement | null | undefined;
}
/** @internal **/
export declare const getSharedActions: ({ core, layerIndex, layerType, activeVisualization, isOnlyLayer, isTextBasedLanguage, onCloneLayer, onRemoveLayer, customRemoveModalText, }: {
    onRemoveLayer: () => void;
    onCloneLayer: () => void;
    layerIndex: number;
    layerId: string;
    isOnlyLayer: boolean;
    activeVisualization: Visualization;
    layerType?: LayerType;
    isTextBasedLanguage?: boolean;
    core: Pick<CoreStart, "overlays" | "analytics" | "i18n" | "theme" | "userProfile">;
    customRemoveModalText?: {
        title?: string;
        description?: string;
    };
}) => LayerAction[];
export declare const LayerActions: (props: LayerActionsProps) => React.JSX.Element | null;
