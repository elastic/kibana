import type { LayerAction } from '@kbn/lens-common';
import type { Visualization } from '../../../..';
interface CloneLayerAction {
    execute: () => void;
    layerIndex: number;
    activeVisualization: Visualization;
    isTextBasedLanguage?: boolean;
}
export declare const getCloneLayerAction: (props: CloneLayerAction) => LayerAction;
export {};
