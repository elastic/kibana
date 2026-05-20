import type { FeatureCollection } from 'geojson';
import { type EuiThemeComputed } from '@elastic/eui';
import type { LayerDescriptor } from '@kbn/maps-plugin/common';
import { FIELD_ORIGIN, STYLE_TYPE } from '@kbn/maps-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import type { VectorSourceRequestMeta } from '@kbn/maps-plugin/common';
import { LAYER_TYPE } from '@kbn/maps-plugin/common';
import type { MlApi } from '../application/services/ml_api_service';
import { type SourceIndexGeoFields } from '../application/explorer/explorer_utils';
export declare const ML_ANOMALY_LAYERS: {
    readonly TYPICAL: "typical";
    readonly ACTUAL: "actual";
    readonly TYPICAL_TO_ACTUAL: "typical to actual";
};
export declare const getCustomColorRampStyleProperty: (euiTheme: EuiThemeComputed) => {
    type: STYLE_TYPE;
    options: {
        customColorRamp: import("@kbn/ml-anomaly-utils").ColorRampStop[];
        field: {
            name: string;
            origin: FIELD_ORIGIN;
        };
        useCustomColorRamp: boolean;
    };
};
export declare const getActualStyle: (euiTheme: EuiThemeComputed) => {
    type: string;
    properties: {
        fillColor: {
            type: STYLE_TYPE;
            options: {
                customColorRamp: import("@kbn/ml-anomaly-utils").ColorRampStop[];
                field: {
                    name: string;
                    origin: FIELD_ORIGIN;
                };
                useCustomColorRamp: boolean;
            };
        };
        lineColor: {
            type: STYLE_TYPE;
            options: {
                customColorRamp: import("@kbn/ml-anomaly-utils").ColorRampStop[];
                field: {
                    name: string;
                    origin: FIELD_ORIGIN;
                };
                useCustomColorRamp: boolean;
            };
        };
    };
    isTimeAware: boolean;
};
export declare const TYPICAL_STYLE: {
    type: string;
    properties: {
        fillColor: {
            type: string;
            options: {
                color: string;
            };
        };
        lineColor: {
            type: string;
            options: {
                color: string;
            };
        };
        lineWidth: {
            type: string;
            options: {
                size: number;
            };
        };
        iconSize: {
            type: string;
            options: {
                size: number;
            };
        };
    };
};
export type MlAnomalyLayersType = (typeof ML_ANOMALY_LAYERS)[keyof typeof ML_ANOMALY_LAYERS];
export declare function getInitialAnomaliesLayers(jobId: string, euiTheme: EuiThemeComputed): {
    id: string;
    type: LAYER_TYPE;
    sourceDescriptor: import("./anomaly_source").AnomalySourceDescriptor;
    style: {
        type: string;
        properties: {
            fillColor: {
                type: string;
                options: {
                    color: string;
                };
            };
            lineColor: {
                type: string;
                options: {
                    color: string;
                };
            };
            lineWidth: {
                type: string;
                options: {
                    size: number;
                };
            };
            iconSize: {
                type: string;
                options: {
                    size: number;
                };
            };
        };
    } | {
        type: string;
        properties: {
            fillColor: {
                type: STYLE_TYPE;
                options: {
                    customColorRamp: import("@kbn/ml-anomaly-utils").ColorRampStop[];
                    field: {
                        name: string;
                        origin: FIELD_ORIGIN;
                    };
                    useCustomColorRamp: boolean;
                };
            };
            lineColor: {
                type: STYLE_TYPE;
                options: {
                    customColorRamp: import("@kbn/ml-anomaly-utils").ColorRampStop[];
                    field: {
                        name: string;
                        origin: FIELD_ORIGIN;
                    };
                    useCustomColorRamp: boolean;
                };
            };
        };
        isTimeAware: boolean;
    };
}[];
export declare function getInitialSourceIndexFieldLayers(sourceIndexWithGeoFields: SourceIndexGeoFields, euiTheme: EuiThemeComputed): LayerDescriptor[] & SerializableRecord;
export declare function getResultsForJobId(mlResultsService: MlApi['results'], jobId: string, locationType: MlAnomalyLayersType, searchFilters: VectorSourceRequestMeta): Promise<FeatureCollection>;
