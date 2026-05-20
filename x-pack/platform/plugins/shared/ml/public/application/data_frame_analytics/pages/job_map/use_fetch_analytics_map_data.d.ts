import { type MapElements } from '@kbn/ml-data-frame-analytics-utils';
export interface GetDataObjectParameter {
    analyticsId?: string;
    id?: string;
    modelId?: string;
    type?: string;
}
export declare const useFetchAnalyticsMapData: () => {
    elements: MapElements[];
    error: any;
    fetchAndSetElementsWrapper: (params?: GetDataObjectParameter) => Promise<void>;
    isLoading: boolean;
    message: string | undefined;
    nodeDetails: Record<string, any>;
    setElements: import("react").Dispatch<import("react").SetStateAction<MapElements[]>>;
    setError: import("react").Dispatch<any>;
};
