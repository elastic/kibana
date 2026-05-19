import type { FramePublicAPI, VisualizationState, LensDatasourceId, TypedLensSerializedState } from '@kbn/lens-common';
import type { CoreStart } from '@kbn/core/public';
import type { ConvertibleLayer } from './esql_conversion_types';
import type { LensPluginStartDependencies } from '../../../plugin';
interface EsqlConversionSettings {
    isConvertToEsqlButtonDisabled: boolean;
    convertToEsqlButtonTooltip: string;
    convertibleLayers: ConvertibleLayer[];
    attributes?: TypedLensSerializedState['attributes'];
}
export declare const useEsqlConversionCheck: (showConvertToEsqlButton: boolean, { attributes, datasourceId, layerIds, visualization, activeVisualization, }: {
    attributes: TypedLensSerializedState["attributes"] | undefined;
    datasourceId: LensDatasourceId;
    layerIds: string[];
    visualization: VisualizationState;
    activeVisualization: unknown;
}, { framePublicAPI, coreStart, startDependencies, }: {
    framePublicAPI: FramePublicAPI;
    coreStart: CoreStart;
    startDependencies: LensPluginStartDependencies;
}) => EsqlConversionSettings;
export {};
