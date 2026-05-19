import type { LensLayerType, VisualizationDimensionGroupConfig } from '@kbn/lens-common';
interface LayerConfig {
    layerId: string;
    layerType: LensLayerType | undefined;
    config: {
        hidden?: boolean | undefined;
        groups: VisualizationDimensionGroupConfig[];
    };
}
export declare const useGetLayerTabsLabel: (layerConfigs: LayerConfig[]) => (layerId: string) => string;
export {};
