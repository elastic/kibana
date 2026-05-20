import type { LayerDescriptor } from '../../common/descriptor_types';
import type { CreateLayerDescriptorParams } from '../classes/sources/es_search_source';
import type { SampleValuesConfig, EMSTermJoinConfig } from '../ems_autosuggest';
import type { Props as PassiveMapProps } from '../lens/passive_map';
import type { Props as MapProps } from '../react_embeddable/map_renderer/map_renderer';
export interface MapsStartApi {
    createLayerDescriptors: {
        createSecurityLayerDescriptors: (indexPatternId: string, indexPatternTitle: string) => Promise<LayerDescriptor[]>;
        createBasemapLayerDescriptor: () => Promise<LayerDescriptor | null>;
        createESSearchSourceLayerDescriptor: (params: CreateLayerDescriptorParams) => Promise<LayerDescriptor>;
    };
    Map: React.FC<MapProps>;
    PassiveMap: React.FC<PassiveMapProps>;
    suggestEMSTermJoinConfig(config: SampleValuesConfig): Promise<EMSTermJoinConfig | null>;
}
