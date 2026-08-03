import { BehaviorSubject } from 'rxjs';
import type { DataView } from '@kbn/data-plugin/common';
import type { LayerDescriptor } from '../../common';
import type { MapStore } from '../reducers/store';
export declare function initializeDataViews(store: MapStore): {
    dataViews$: BehaviorSubject<DataView[] | undefined>;
    setLayerList(layerList: LayerDescriptor[]): void;
    updateLayerById: (layerDescriptor: LayerDescriptor) => void;
};
