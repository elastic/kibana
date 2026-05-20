import type { IVectorLayer } from '../vector_layer';
import { GeoJsonVectorLayer } from '../geojson_vector_layer';
import type { IVectorStyle } from '../../../styles/vector/vector_style';
import { VectorStyle } from '../../../styles/vector/vector_style';
import { ESGeoGridSource } from '../../../sources/es_geo_grid_source/es_geo_grid_source';
import type { ISource } from '../../../sources/source';
import type { DataRequestContext } from '../../../../actions';
import type { CustomIcon, VectorLayerDescriptor } from '../../../../../common/descriptor_types';
import type { IVectorSource } from '../../../sources/vector_source';
import type { LICENSED_FEATURES } from '../../../../licensed_features';
import type { ESSearchSource } from '../../../sources/es_search_source/es_search_source';
export interface BlendedVectorLayerArguments {
    chartsPaletteServiceGetColor?: (value: string) => string | null;
    source: IVectorSource;
    layerDescriptor: VectorLayerDescriptor;
    customIcons: CustomIcon[];
}
export declare class BlendedVectorLayer extends GeoJsonVectorLayer implements IVectorLayer {
    static createDescriptor(options: Partial<VectorLayerDescriptor>, mapColors: string[]): VectorLayerDescriptor;
    private _isClustered;
    private readonly _clusterSource;
    private readonly _clusterStyle;
    private readonly _documentSource;
    private readonly _documentStyle;
    constructor(options: BlendedVectorLayerArguments);
    getDisplayName(source?: ISource): Promise<string>;
    getJoins(): never[];
    hasJoins(): boolean;
    cloneDescriptor(): Promise<VectorLayerDescriptor[]>;
    getSource: () => ESGeoGridSource | ESSearchSource;
    getSourceForEditing(): ESSearchSource;
    getCurrentStyle(): VectorStyle;
    getStyleForEditing(): IVectorStyle;
    syncData(syncContext: DataRequestContext): Promise<void>;
    getLicensedFeatures(): Promise<LICENSED_FEATURES[]>;
}
