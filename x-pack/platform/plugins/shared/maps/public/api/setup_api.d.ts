import type { SourceRegistryEntry } from '../classes/sources/source_registry';
import type { LayerWizard } from '../classes/layers';
export interface MapsSetupApi {
    registerLayerWizard(layerWizard: LayerWizard): void;
    registerSource(entry: SourceRegistryEntry): void;
}
