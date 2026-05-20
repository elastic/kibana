import type { LensPublicStart, ChartInfo } from '@kbn/lens-plugin/public';
import type { ErrorType } from '@kbn/ml-error-utils';
import type { LensApi } from '@kbn/lens-plugin/public';
import { JOB_TYPE } from '../../../../../common/constants/new_job';
type VisualizationType = Awaited<ReturnType<LensPublicStart['getXyVisTypes']>>[number];
export interface LayerResult {
    id: string;
    layerType: string;
    label: string;
    icon: VisualizationType['icon'];
    isCompatible: boolean;
    jobType: JOB_TYPE | null;
    error?: ErrorType;
}
export declare class VisualizationExtractor {
    constructor();
    getResultLayersFromEmbeddable(embeddable: LensApi, lens: LensPublicStart): Promise<LayerResult[]>;
    extractFields(layer: ChartInfo['layers'][number]): Promise<{
        fields: {
            name: string;
            id: string;
            role: "split" | "metric";
            dimensionType: string;
            operation: import("@kbn/lens-common").OperationDescriptor & {
                type: string;
                fields?: string[];
                filter?: import("@kbn/es-query").Query;
            };
        }[];
        timeField: {
            name: string;
            id: string;
            role: "split" | "metric";
            dimensionType: string;
            operation: import("@kbn/lens-common").OperationDescriptor & {
                type: string;
                fields?: string[];
                filter?: import("@kbn/es-query").Query;
            };
        };
        splitField: {
            name: string;
            id: string;
            role: "split" | "metric";
            dimensionType: string;
            operation: import("@kbn/lens-common").OperationDescriptor & {
                type: string;
                fields?: string[];
                filter?: import("@kbn/es-query").Query;
            };
        } | undefined;
        dataView: import("@kbn/data-views-plugin/common").DataView;
    }>;
    private getLayers;
}
export {};
