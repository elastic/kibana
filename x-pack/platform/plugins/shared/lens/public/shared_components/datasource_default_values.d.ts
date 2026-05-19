import type { DatasourceLayers } from '@kbn/lens-common';
type VisState = {
    layers: Array<{
        layerId: string;
    }>;
} | {
    layerId: string;
};
interface MappedVisualValue {
    truncateText: boolean;
}
export declare function getDefaultVisualValuesForLayer(state: VisState | undefined, datasourceLayers: DatasourceLayers): MappedVisualValue;
export {};
