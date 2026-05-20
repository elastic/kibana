import type { PublishesDataViews } from '@kbn/presentation-publishing';
import { type MapApi } from '@kbn/maps-plugin/public';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Query } from '@kbn/es-query';
export interface LayerResult {
    layerId: string;
    layerDisplayName: string;
    geoField: string;
    dataViewId: string;
    dataView: DataView | undefined;
    splitFieldOptions?: EuiComboBoxOptionOption[];
    query: Query | null;
}
export declare class VisualizationExtractor {
    constructor();
    getResultLayersFromEmbeddable(embeddable: MapApi & Partial<PublishesDataViews>): Promise<LayerResult[]>;
    private getSplitFieldOptions;
}
