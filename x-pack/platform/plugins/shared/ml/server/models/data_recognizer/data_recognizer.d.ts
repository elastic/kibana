import type { KibanaRequest, IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { RecognizeModuleResultDataView } from '@kbn/ml-common-types/modules';
import type { Module, FileBasedModule, JobOverride, DatafeedOverride, DataRecognizerConfigResponse, RecognizeResult } from '@kbn/ml-common-types/modules';
import type { JobExistResult } from '@kbn/ml-common-types/data_recognizer';
import type { CompatibleModule } from '../../../common/constants/app';
import type { MlClient } from '../../lib/ml_client';
import type { MLSavedObjectService } from '../../saved_objects';
export declare const SAVED_OBJECT_TYPES: {
    DASHBOARD: string;
    SEARCH: string;
    VISUALIZATION: string;
};
export interface Config {
    dirName?: string;
    module: FileBasedModule | Module;
    isSavedObject: boolean;
}
export declare class DataRecognizer {
    private _client;
    private _mlClient;
    private _savedObjectsClient;
    private _mlSavedObjectService;
    private _dataViewsService;
    private _request;
    private _modulesDir;
    private _indexPatternName;
    private _indexPatternId;
    private _jobsService;
    private _resultsService;
    private _calculateModelMemoryLimit;
    private _compatibleModuleType;
    /**
     * A temporary cache of configs loaded from disk and from save object service.
     * The configs from disk will not change while kibana is running.
     * The configs from saved objects could potentially change while an instance of
     * DataRecognizer exists, if a fleet package containing modules is installed.
     * However the chance of this happening is very low and so the benefit of using
     * this cache outweighs the risk of the cache being out of date during the short
     * existence of a DataRecognizer instance.
     */
    private _configCache;
    /**
     * List of the module jobs that require model memory estimation
     */
    private _jobsForModelMemoryEstimation;
    constructor(mlClusterClient: IScopedClusterClient, mlClient: MlClient, savedObjectsClient: SavedObjectsClientContract, dataViewsService: DataViewsService, mlSavedObjectService: MLSavedObjectService, request: KibanaRequest, compatibleModuleType: CompatibleModule | null);
    private _listDirs;
    private _readFile;
    private _loadConfigs;
    private _loadSavedObjectModules;
    private _findConfig;
    findIndexMatches(moduleId: string, size?: number): Promise<RecognizeModuleResultDataView[]>;
    findMatches(indexPattern: string, moduleTagFilters?: string[]): Promise<RecognizeResult[]>;
    private _loadLogoFile;
    private _searchForFields;
    listModules(moduleTagFilters?: string[]): Promise<Module[]>;
    getModule(id: string, moduleTagFilters?: string[], prefix?: string): Promise<Module>;
    setup(moduleId: string, jobPrefix?: string, groups?: string[], indexPatternName?: string, query?: any, useDedicatedIndex?: boolean, startDatafeed?: boolean, start?: number, end?: number, jobOverrides?: JobOverride | JobOverride[], datafeedOverrides?: DatafeedOverride | DatafeedOverride[], estimateModelMemory?: boolean, applyToAllSpaces?: boolean): Promise<DataRecognizerConfigResponse>;
    dataRecognizerJobsExist(moduleId: string): Promise<JobExistResult>;
    private _getIndexPatternId;
    private _createSavedObjectsToSave;
    private _updateKibanaResults;
    private _populateKibanaResultErrors;
    private _checkIfSavedObjectsExist;
    private _loadExistingSavedObjects;
    private _saveKibanaObjects;
    private _saveJobs;
    private _saveJob;
    private _saveDatafeeds;
    private _saveDatafeed;
    private _startDatafeeds;
    private _startDatafeed;
    private _updateResults;
    private _createResultsTemplate;
    private _updateDatafeedIndices;
    private _updateJobUrlIndexPatterns;
    private _doJobUrlsContainIndexPatternId;
    private _updateSavedObjectIndexPatterns;
    /**
     * Provides a time range of the last 3 months of data
     */
    private _getFallbackTimeRange;
    /**
     * Ensure the model memory limit for each job is not greater than
     * the max model memory setting for the cluster
     */
    private _updateModelMemoryLimits;
    private _doSavedObjectsContainIndexPatternId;
    applyJobConfigOverrides(moduleConfig: Module, jobOverrides?: JobOverride | JobOverride[], jobPrefix?: string): void;
    applyDatafeedConfigOverrides(moduleConfig: Module, datafeedOverrides?: DatafeedOverride | DatafeedOverride[], jobPrefix?: string): void;
}
export declare function dataRecognizerFactory(client: IScopedClusterClient, mlClient: MlClient, savedObjectsClient: SavedObjectsClientContract, dataViewsService: DataViewsService, mlSavedObjectService: MLSavedObjectService, request: KibanaRequest, compatibleModuleType: CompatibleModule | null): DataRecognizer;
/**
 * Filters an array of modules based on the provided tag filters
 *
 * @param configs - The array of module config objects to filter.
 * @param compatibleModuleType - The CompatibleModule type to filter by, or null to include all modules. The compatibleModuleType is provided by the kibana yml config.
 * @param moduleTagFilters - An array of module tags to filter by. Only modules that have at least one matching tag will be included. The moduleTagFilters are provided as a query parameter to the endpoint.
 * @returns An array of module Config objects that match the provided criteria.
 */
export declare function filterConfigs(configs: Config[], compatibleModuleType: CompatibleModule | null, moduleTagFilters: string[]): Config[];
