import type { DataView } from '@kbn/data-views-plugin/common';
import type { LayerDescriptor } from '@kbn/maps-plugin/common';
import type { MapsStartApi } from '@kbn/maps-plugin/public';
import type { Query } from '@kbn/es-query';
import type { Field, SplitField } from '@kbn/ml-anomaly-utils';
import { ChartLoader } from '../chart_loader';
import type { MlApi } from '../../../../services/ml_api_service';
export declare class MapLoader extends ChartLoader {
    private _getMapData;
    constructor(mlApi: MlApi, indexPattern: DataView, query: object, mapsPlugin: MapsStartApi | undefined);
    getMapLayersForGeoJob(geoField: Field, splitField: SplitField, fieldValues: string[], savedSearchQuery?: Query): Promise<LayerDescriptor[]>;
}
