import type { IScopedClusterClient } from '@kbn/core/server';
import { type AnalyticsMapReturnType } from '@kbn/ml-data-frame-analytics-utils';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { MlFeatures } from '../../../common/constants/app';
import { type ExtendAnalyticsMapArgs } from './types';
import type { MlClient } from '../../lib/ml_client';
export declare class AnalyticsManager {
    private readonly _mlClient;
    private readonly _client;
    private readonly _enabledFeatures;
    private _trainedModels;
    private _jobs;
    private _modelsProvider;
    constructor(_mlClient: MlClient, _client: IScopedClusterClient, _enabledFeatures: MlFeatures, cloud: CloudSetup);
    private initData;
    private getMissingJobNode;
    private isDuplicateElement;
    private getIndexData;
    private getTransformData;
    private findJobModel;
    private findJob;
    private findTrainedModel;
    private getNextLink;
    private getAnalyticsModelElements;
    private getIndexPatternElements;
    /**
     * Prepares the initial elements for incoming modelId
     * @param modelId
     */
    private getInitialElementsModelRoot;
    /**
     * Prepares the initial elements for incoming jobId
     * @param jobId
     */
    private getInitialElementsJobRoot;
    /**
     * Works backward from jobId or modelId to return related jobs, indices, models, and transforms
     * @param jobId (optional)
     * @param modelId (optional)
     */
    private getAnalyticsMap;
    /**
     * Expanded wrapper of getAnalyticsMap, which also handles generic models that are not tied to an analytics job
     * Retrieves info about model and ingest pipeline, index, and transforms associated with the model
     * @param analyticsId
     * @param modelId
     */
    extendModelsMap({ analyticsId, modelId, }: {
        analyticsId?: string;
        modelId?: string;
    }): Promise<AnalyticsMapReturnType>;
    extendAnalyticsMapForAnalyticsJob({ analyticsId, index, }: ExtendAnalyticsMapArgs): Promise<AnalyticsMapReturnType>;
}
