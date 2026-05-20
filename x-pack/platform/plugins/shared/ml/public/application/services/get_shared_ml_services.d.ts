import { type HttpStart } from '@kbn/core-http-browser';
import type { ElasticModels } from './elastic_models_service';
export type MlSharedServices = ReturnType<typeof getMlSharedServices>;
/**
 * Provides ML services exposed from the plugin start.
 */
export declare function getMlSharedServices(httpStart: HttpStart): {
    elasticModels: ElasticModels;
    mlApi: {
        getJobs(obj?: {
            jobId?: string;
        }): Promise<{
            jobs: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job[];
            count: number;
        }>;
        getJobs$(obj?: {
            jobId?: string;
        }): import("rxjs").Observable<{
            count: number;
            jobs: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job[];
        }>;
        getJobStats(obj: {
            jobId?: string;
        }): Promise<{
            jobs: import("@kbn/ml-common-types/anomaly_detection_jobs/job_stats").JobStats[];
            count: number;
        }>;
        addJob({ jobId, job }: {
            jobId: string;
            job: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job;
        }): Promise<import("@elastic/elasticsearch/lib/api/types").MlPutJobResponse>;
        openJob({ jobId }: {
            jobId: string;
        }): Promise<any>;
        closeJob({ jobId }: {
            jobId: string;
        }): Promise<any>;
        forceCloseJob({ jobId }: {
            jobId: string;
        }): Promise<any>;
        deleteJob({ jobId }: {
            jobId: string;
        }): Promise<import("@elastic/elasticsearch/lib/api/types").AcknowledgedResponseBase>;
        forceDeleteJob({ jobId }: {
            jobId: string;
        }): Promise<import("@elastic/elasticsearch/lib/api/types").AcknowledgedResponseBase>;
        updateJob({ jobId, job }: {
            jobId: string;
            job: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job;
        }): Promise<any>;
        estimateBucketSpan(obj: import("@kbn/ml-common-types/job_service").BucketSpanEstimatorData): Promise<import("./ml_api_service").BucketSpanEstimatorResponse>;
        validateJob(payload: {
            job: import("@kbn/ml-common-types/anomaly_detection_jobs/combined_job").CombinedJob;
            duration: {
                start?: number;
                end?: number;
            };
            fields?: any[];
        }): Promise<any>;
        validateDatafeedPreview(payload: {
            job: import("@kbn/ml-common-types/anomaly_detection_jobs/combined_job").CombinedJob;
            start?: number;
            end?: number;
        }): Promise<import("@kbn/ml-common-types/job_validation").DatafeedValidationResponse>;
        validateCardinality$(job: import("@kbn/ml-common-types/anomaly_detection_jobs/combined_job").CombinedJob): import("rxjs").Observable<import("./ml_api_service").CardinalityValidationResults>;
        getDatafeeds(obj: {
            datafeedId: string;
        }): Promise<any>;
        getDatafeedStats(obj: {
            datafeedId: string;
        }): Promise<any>;
        addDatafeed({ datafeedId, datafeedConfig }: {
            datafeedId: string;
            datafeedConfig: import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").Datafeed;
        }): Promise<import("@elastic/elasticsearch/lib/api/types").MlPutDatafeedResponse>;
        updateDatafeed({ datafeedId, datafeedConfig, }: {
            datafeedId: string;
            datafeedConfig: Partial<import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").Datafeed>;
        }): Promise<any>;
        deleteDatafeed({ datafeedId }: {
            datafeedId: string;
        }): Promise<any>;
        forceDeleteDatafeed({ datafeedId }: {
            datafeedId: string;
        }): Promise<any>;
        startDatafeed({ datafeedId, start, end, }: {
            datafeedId: string;
            start?: number;
            end?: number;
        }): Promise<any>;
        stopDatafeed({ datafeedId }: {
            datafeedId: string;
        }): Promise<any>;
        forceStopDatafeed({ datafeedId }: {
            datafeedId: string;
        }): Promise<any>;
        datafeedPreview({ datafeedId }: {
            datafeedId: string;
        }): Promise<any>;
        forecast({ jobId, duration, neverExpires, }: {
            jobId: string;
            duration?: string;
            neverExpires?: boolean;
        }): Promise<any>;
        deleteForecast({ jobId, forecastId }: {
            jobId: string;
            forecastId: string;
        }): Promise<import("./ml_api_service").DeleteForecastResponse>;
        overallBuckets({ jobId, topN, bucketSpan, start, end, overallScore, }: {
            jobId: string[];
            topN: string;
            bucketSpan: string;
            start: number;
            end: number;
            overallScore?: number;
        }): Promise<import("@elastic/elasticsearch/lib/api/types").MlGetOverallBucketsResponse>;
        hasPrivileges(obj: any): Promise<import("./ml_api_service").MlHasPrivilegesResponse>;
        checkMlCapabilities(): Promise<import("@kbn/ml-common-types/capabilities").MlCapabilitiesResponse>;
        checkIndicesExists({ indices }: {
            indices: string[];
        }): Promise<Record<string, {
            exists: boolean;
        }>>;
        recognizeIndex({ indexPatternTitle, filter, }: {
            indexPatternTitle: string;
            filter?: string[];
        }): Promise<import("@kbn/ml-common-types/modules").RecognizeResult[]>;
        recognizeModule({ moduleId, size }: {
            moduleId: string;
            size?: number;
        }): Promise<import("@kbn/ml-common-types/modules").RecognizeModuleResult>;
        listDataRecognizerModules(filter?: string[]): Promise<any>;
        getDataRecognizerModule(params?: {
            moduleId: string;
            filter?: string[];
        }): Promise<import("@kbn/ml-common-types/modules").Module | import("@kbn/ml-common-types/modules").Module[]>;
        dataRecognizerModuleJobsExist({ moduleId }: {
            moduleId: string;
        }): Promise<any>;
        setupDataRecognizerConfig({ moduleId, prefix, groups, indexPatternName, query, useDedicatedIndex, startDatafeed, start, end, jobOverrides, estimateModelMemory, }: {
            moduleId: string;
            prefix?: string;
            groups?: string[];
            indexPatternName?: string;
            query?: any;
            useDedicatedIndex?: boolean;
            startDatafeed?: boolean;
            start?: number;
            end?: number;
            jobOverrides?: Array<Partial<import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job>>;
            estimateModelMemory?: boolean;
        }): Promise<import("@kbn/ml-common-types/modules").DataRecognizerConfigResponse>;
        getVisualizerFieldHistograms({ indexPattern, query, fields, samplerShardSize, runtimeMappings, projectRouting, }: {
            indexPattern: string;
            query: any;
            fields: import("../datavisualizer/index_based/common/request").FieldHistogramRequestConfig[];
            samplerShardSize?: number;
            runtimeMappings?: import("@kbn/ml-runtime-field-utils").RuntimeMappings;
            projectRouting?: string;
        }): Promise<any>;
        calendars(obj?: {
            calendarId?: import("@kbn/ml-common-types/calendars").MlCalendarId;
            calendarIds?: import("@kbn/ml-common-types/calendars").MlCalendarId[];
        }): Promise<import("@kbn/ml-common-types/calendars").MlCalendar[]>;
        addCalendar(obj: import("@kbn/ml-common-types/calendars").MlCalendar): Promise<any>;
        updateCalendar(obj: import("@kbn/ml-common-types/calendars").UpdateCalendar): Promise<any>;
        deleteCalendar({ calendarId }: {
            calendarId?: string;
        }): Promise<any>;
        mlNodeCount(): Promise<import("@kbn/ml-common-types/ml_server_info").MlNodeCount>;
        mlInfo(): Promise<import("./ml_api_service").MlInfoResponse>;
        calculateModelMemoryLimit$({ datafeedConfig, analysisConfig, indexPattern, query, timeFieldName, earliestMs, latestMs, }: {
            datafeedConfig?: import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").Datafeed;
            analysisConfig: import("@kbn/ml-common-types/anomaly_detection_jobs/job").AnalysisConfig;
            indexPattern: string;
            query: any;
            timeFieldName: string;
            earliestMs: number;
            latestMs: number;
        }): import("rxjs").Observable<{
            modelMemoryLimit: string;
        }>;
        getCardinalityOfFields({ index, fieldNames, query, timeFieldName, earliestMs, latestMs, }: {
            index: string;
            fieldNames: string[];
            query: any;
            timeFieldName: string;
            earliestMs: number;
            latestMs: number;
        }): Promise<any>;
        getTimeFieldRange({ index, timeFieldName, query, runtimeMappings, indicesOptions, allowFutureTime, projectRouting, }: {
            index: string;
            timeFieldName?: string;
            query: any;
            runtimeMappings?: import("@kbn/ml-runtime-field-utils").RuntimeMappings;
            indicesOptions?: import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").IndicesOptions;
            allowFutureTime?: boolean;
            projectRouting?: string;
        }): Promise<import("./ml_api_service").GetTimeFieldRangeResponse>;
        esSearch(obj: any): Promise<any>;
        esSearch$(obj: any): import("rxjs").Observable<any>;
        getIndices(): Promise<{
            name: string;
        }[]>;
        getModelSnapshots(jobId: string, snapshotId?: string): Promise<import("./ml_api_service").GetModelSnapshotsResponse>;
        updateModelSnapshot(jobId: string, snapshotId: string, body: {
            description?: string;
            retain?: boolean;
        }): Promise<any>;
        deleteModelSnapshot(jobId: string, snapshotId: string): Promise<any>;
        reindexWithPipeline(pipelineName: string, sourceIndex: string, destinationIndex: string): Promise<import("@elastic/elasticsearch/lib/api/types").ReindexResponse>;
        annotations: {
            getAnnotations$(obj: {
                jobIds: string[];
                earliestMs: number;
                latestMs: number;
                maxAnnotations: number;
                detectorIndex?: number;
                entities?: any[];
            }): import("rxjs").Observable<import("@kbn/ml-common-types/annotations").GetAnnotationsResponse>;
            getAnnotations(obj: {
                jobIds: string[];
                earliestMs: number | null;
                latestMs: number | null;
                maxAnnotations: number;
                detectorIndex?: number;
                entities?: any[];
            }): Promise<import("@kbn/ml-common-types/annotations").GetAnnotationsResponse>;
            indexAnnotation(obj: import("@kbn/ml-common-types/annotations").Annotation): Promise<any>;
            deleteAnnotation(id: string): Promise<any>;
        };
        dataFrameAnalytics: {
            getDataFrameAnalytics(analyticsId?: string, excludeGenerated?: boolean, size?: number): Promise<import("./ml_api_service/data_frame_analytics").GetDataFrameAnalyticsResponse>;
            getDataFrameAnalyticsStats(analyticsId?: string): Promise<import("./ml_api_service/data_frame_analytics").GetDataFrameAnalyticsStatsResponse>;
            createDataFrameAnalytics(analyticsId: string, analyticsConfig: import("@kbn/utility-types").DeepPartial<import("@kbn/ml-data-frame-analytics-utils").DataFrameAnalyticsConfig>, createDataView?: boolean, timeFieldName?: string): Promise<import("../../../server/routes/schemas/data_frame_analytics_schema").PutDataFrameAnalyticsResponseSchema>;
            updateDataFrameAnalytics(analyticsId: string, updateConfig: import("@kbn/ml-data-frame-analytics-utils").UpdateDataFrameAnalyticsConfig): Promise<any>;
            getDataFrameAnalyticsMap(id: string, treatAsRoot: boolean, type?: string): Promise<import("@kbn/ml-data-frame-analytics-utils").AnalyticsMapReturnType>;
            jobsExist(analyticsIds: string[], allSpaces?: boolean): Promise<import("./ml_api_service/data_frame_analytics").JobsExistsResponse>;
            evaluateDataFrameAnalytics(evaluateConfig: any): Promise<any>;
            explainDataFrameAnalytics(jobConfig: import("@kbn/utility-types").DeepPartial<import("@kbn/ml-data-frame-analytics-utils").DataFrameAnalyticsConfig>): Promise<any>;
            deleteDataFrameAnalytics(analyticsId: string, force?: boolean): Promise<any>;
            deleteDataFrameAnalyticsAndDestIndex(analyticsId: string, deleteDestIndex: boolean, deleteDestDataView: boolean, force?: boolean): Promise<import("./ml_api_service/data_frame_analytics").DeleteDataFrameAnalyticsWithIndexResponse>;
            startDataFrameAnalytics(analyticsId: string): Promise<any>;
            stopDataFrameAnalytics(analyticsId: string, force?: boolean): Promise<any>;
            getAnalyticsAuditMessages(analyticsId: string): Promise<import("@kbn/ml-common-types/audit_message").JobMessage[]>;
            validateDataFrameAnalytics(analyticsConfig: import("@kbn/utility-types").DeepPartial<import("@kbn/ml-data-frame-analytics-utils").DataFrameAnalyticsConfig>): Promise<import("@kbn/ml-validators").ValidateAnalyticsJobResponse>;
            newJobCapsAnalytics(indexPatternTitle: string, isRollup?: boolean): Promise<import("@kbn/ml-anomaly-utils").NewJobCapsResponse>;
        };
        filters: {
            filters(obj?: {
                filterId?: string;
            }): Promise<import("@kbn/ml-common-types/filters").Filter[]>;
            filtersStats(): Promise<import("@kbn/ml-common-types/filters").FilterStats[]>;
            addFilter(filterId: string, description: string, items: string[]): Promise<import("@kbn/ml-common-types/filters").Filter>;
            updateFilter(filterId: string, description: string, addItems: string[], removeItems: string[]): Promise<import("@kbn/ml-common-types/filters").Filter>;
            deleteFilter(filterId: string): Promise<{
                acknowledged: boolean;
            }>;
        };
        results: {
            getAnomaliesTableData(jobIds: string[], criteriaFields: string[], influencers: import("@kbn/ml-anomaly-utils").MlEntityField[], aggregationInterval: string, threshold: import("@kbn/ml-server-schemas/embeddables/anomaly_charts").SeverityThreshold[], earliestMs: number, latestMs: number, dateFormatTz: string, maxRecords: number, maxExamples?: number, influencersFilterQuery?: any, functionDescription?: string): import("rxjs").Observable<import("@kbn/ml-common-types/results").GetAnomaliesTableDataResult>;
            getMaxAnomalyScore(jobIds: string[], earliestMs: number, latestMs: number): Promise<any>;
            getCategoryDefinition(jobId: string, categoryId: string): Promise<import("./ml_api_service/results").CategoryDefinition>;
            getCategoryExamples(jobId: string, categoryIds: string[], maxExamples: number): Promise<any>;
            fetchPartitionFieldsValues(jobId: import("@kbn/ml-common-types/anomaly_detection_jobs/job").JobId, searchTerm: Record<string, string>, criteriaFields: Array<{
                fieldName: string;
                fieldValue: any;
            }>, earliestMs: number, latestMs: number, fieldsConfig?: import("@kbn/ml-common-types/storage").PartitionFieldsConfig): import("rxjs").Observable<import("./results_service/result_service_rx").PartitionFieldsDefinition>;
            anomalySearch(query: import("@kbn/es-types").ESSearchRequest, jobIds: string[]): Promise<import("@kbn/es-types").ESSearchResponse<import("@kbn/ml-anomaly-utils").MlAnomalyRecordDoc>>;
            anomalySearch$(query: import("@kbn/es-types").ESSearchRequest, jobIds: string[]): import("rxjs").Observable<import("@kbn/es-types").ESSearchResponse<import("@kbn/ml-anomaly-utils").MlAnomalyRecordDoc>>;
            getCategoryStoppedPartitions(jobIds: string[], fieldToBucket?: typeof import("@kbn/ml-anomaly-utils").ML_JOB_ID | typeof import("@kbn/ml-anomaly-utils").ML_PARTITION_FIELD_VALUE): Promise<import("@kbn/ml-common-types/results").GetStoppedPartitionResult>;
            getDatafeedResultChartData(jobId: string, start: number, end: number): Promise<import("@kbn/ml-common-types/results").GetDatafeedResultsChartDataResult>;
            getAnomalyCharts$(jobIds: string[], influencers: import("@kbn/ml-anomaly-utils").MlEntityField[], threshold: import("@kbn/ml-server-schemas/embeddables/anomaly_charts").SeverityThreshold[], earliestMs: number, latestMs: number, timeBounds: {
                min?: number;
                max?: number;
            }, maxResults: number, numberOfPoints: number, influencersFilterQuery?: import("@kbn/ml-anomaly-utils").InfluencersFilterQuery): import("rxjs").Observable<import("@kbn/ml-common-types/results").ExplorerChartsData>;
            getAnomalyRecords$(jobIds: string[], criteriaFields: import("@kbn/ml-common-types/results").CriteriaField[], severity: number, earliestMs: number | null, latestMs: number | null, interval: string, functionDescription?: string): import("rxjs").Observable<{
                success: boolean;
                records: import("@kbn/ml-anomaly-utils").MlAnomalyRecordDoc[];
            }>;
            getTopInfluencers(payload: import("@kbn/ml-common-types/results").GetTopInfluencersRequest): Promise<import("@kbn/ml-common-types/results").InfluencersByFieldResponse>;
            getScoresByBucket(payload: {
                jobIds: string[];
                earliestMs: number;
                latestMs: number;
                intervalMs: number;
                perPage?: number;
                fromPage?: number;
                swimLaneSeverity?: Array<{
                    min: number;
                    max?: number;
                }>;
            }): Promise<import("@kbn/ml-common-types/results").ViewByResponse>;
            getInfluencerValueMaxScoreByTime(payload: {
                jobIds: string[];
                influencerFieldName: string;
                influencerFieldValues?: string[];
                earliestMs: number;
                latestMs: number;
                intervalMs: number;
                maxResults?: number;
                perPage?: number;
                fromPage?: number;
                influencersFilterQuery?: unknown;
                swimLaneSeverity?: Array<{
                    min: number;
                    max?: number;
                }>;
            }): Promise<import("@kbn/ml-common-types/results").ViewByResponse>;
        };
        jobs: {
            jobsSummary(jobIds: string[]): Promise<import("@kbn/ml-common-types/anomaly_detection_jobs/summary_job").MlSummaryJobs>;
            jobIdsWithGeo(): Promise<string[]>;
            jobsWithTimerange(dateFormatTz: string): Promise<{
                jobs: import("@kbn/ml-common-types/anomaly_detection_jobs/summary_job").MlJobWithTimeRange[];
                jobsMap: import("@kbn/ml-common-types/common").Dictionary<import("@kbn/ml-common-types/anomaly_detection_jobs/summary_job").MlJobWithTimeRange>;
            }>;
            jobForCloning(jobId: string, retainCreatedBy?: boolean): Promise<{
                job?: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job;
                datafeed?: import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").Datafeed;
            } | undefined>;
            jobs(jobIds: string[]): Promise<import("@kbn/ml-common-types/anomaly_detection_jobs/combined_job").CombinedJobWithStats[]>;
            groups(): Promise<import("@kbn/ml-common-types/groups").Group[]>;
            updateGroups(updatedJobs: Array<{
                jobId: string;
                groups: string[];
            }>): Promise<any>;
            forceStartDatafeeds(datafeedIds: string[], start: string, end: string): Promise<any>;
            stopDatafeeds(datafeedIds: string[], closeJobs?: boolean): Promise<any>;
            deleteJobs(jobIds: string[], deleteUserAnnotations?: boolean, deleteAlertingRules?: boolean): Promise<any>;
            closeJobs(jobIds: string[]): Promise<any>;
            resetJobs(jobIds: string[], deleteUserAnnotations?: boolean): Promise<import("@kbn/ml-common-types/job_service").ResetJobsResponse>;
            forceStopAndCloseJob(jobId: string): Promise<{
                success: boolean;
            }>;
            jobAuditMessages({ jobId, from, start, end, }: {
                jobId: string;
                from?: number;
                start?: string;
                end?: string;
            }): Promise<{
                messages: import("@kbn/ml-common-types/audit_message").JobMessage[];
                notificationIndices: string[];
            }>;
            clearJobAuditMessages(jobId: string, notificationIndices: string[]): Promise<{
                success: boolean;
                latest_cleared: number;
            }>;
            blockingJobTasks(): Promise<Record<string, import("../../../common/constants/job_actions").JobAction>>;
            jobsExist(jobIds: string[], allSpaces?: boolean): Promise<import("@kbn/ml-common-types/job_service").JobsExistResponse>;
            jobsExist$(jobIds: string[], allSpaces?: boolean): import("rxjs").Observable<import("@kbn/ml-common-types/job_service").JobsExistResponse>;
            newJobCaps(indexPatternTitle: string, isRollup?: boolean): Promise<any>;
            newJobLineChart(indexPatternTitle: string, timeField: string, start: number, end: number, intervalMs: number, query: any, aggFieldNamePairs: import("@kbn/ml-anomaly-utils").AggFieldNamePair[], splitFieldName: string | null, splitFieldValue: string | null, runtimeMappings?: import("@kbn/ml-runtime-field-utils").RuntimeMappings, indicesOptions?: import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").IndicesOptions): Promise<any>;
            newJobPopulationsChart(indexPatternTitle: string, timeField: string, start: number, end: number, intervalMs: number, query: any, aggFieldNamePairs: import("@kbn/ml-anomaly-utils").AggFieldNamePair[], splitFieldName: string, runtimeMappings?: import("@kbn/ml-runtime-field-utils").RuntimeMappings, indicesOptions?: import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").IndicesOptions): Promise<any>;
            getAllJobAndGroupIds(): Promise<import("./job_service").ExistingJobsAndGroups>;
            getLookBackProgress(jobId: string, start: number, end: number): Promise<{
                progress: number;
                isRunning: boolean;
                isJobClosed: boolean;
            }>;
            categorizationFieldExamples(indexPatternTitle: string, query: any, size: number, field: string, timeField: string, start: number, end: number, analyzer: import("@kbn/ml-category-validator").CategorizationAnalyzer, runtimeMappings?: import("@kbn/ml-runtime-field-utils").RuntimeMappings, indicesOptions?: import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").IndicesOptions, includeExamples?: boolean): Promise<import("@kbn/ml-category-validator").FieldValidationResults>;
            topCategories(jobId: string, count: number): Promise<{
                total: number;
                categories: Array<{
                    count?: number;
                    category: import("@kbn/ml-common-types/categories").Category;
                }>;
            }>;
            revertModelSnapshot(jobId: string, snapshotId: string, replay: boolean, end?: number, calendarEvents?: Array<{
                start: number;
                end: number;
                description: string;
            }>): Promise<{
                success: boolean;
            }>;
            datafeedPreview(datafeedId?: string, job?: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job, datafeed?: import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").Datafeed): Promise<unknown[]>;
            bulkCreateJobs(jobs: {
                job: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job;
                datafeed: import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").Datafeed;
            } | Array<{
                job: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job;
                datafeed: import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").Datafeed;
            }>): Promise<import("@kbn/ml-common-types/job_service").BulkCreateResults>;
        };
        savedObjects: {
            jobsSpaces(): Promise<import("@kbn/ml-common-types/saved_objects").JobsSpacesResponse>;
            updateJobsSpaces(jobType: import("@kbn/ml-common-types/saved_objects").JobType, jobIds: string[], spacesToAdd: string[], spacesToRemove: string[]): Promise<import("@kbn/ml-common-types/saved_objects").SavedObjectResult>;
            removeItemFromCurrentSpace(mlSavedObjectType: import("@kbn/ml-common-types/saved_objects").MlSavedObjectType, ids: string[]): Promise<import("@kbn/ml-common-types/saved_objects").SavedObjectResult>;
            syncSavedObjects(simulate?: boolean, addToAllSpaces?: boolean): Promise<import("@kbn/ml-common-types/saved_objects").SyncSavedObjectResponse>;
            initSavedObjects(simulate?: boolean): Promise<import("@kbn/ml-common-types/saved_objects").InitializeSavedObjectResponse>;
            syncCheck(mlSavedObjectType?: import("@kbn/ml-common-types/saved_objects").MlSavedObjectType): Promise<import("@kbn/ml-common-types/saved_objects").SyncCheckResponse>;
            canDeleteMLSpaceAwareItems(mlSavedObjectType: import("@kbn/ml-common-types/saved_objects").MlSavedObjectType, ids: string[]): Promise<import("@kbn/ml-common-types/saved_objects").CanDeleteMLSpaceAwareItemsResponse>;
            canSyncToAllSpaces(mlSavedObjectType?: import("@kbn/ml-common-types/saved_objects").MlSavedObjectType): Promise<import("@kbn/ml-common-types/saved_objects").CanSyncToAllSpacesResponse>;
            trainedModelsSpaces(): Promise<import("@kbn/ml-common-types/saved_objects").TrainedModelsSpacesResponse>;
            updateModelsSpaces(modelIds: string[], spacesToAdd: string[], spacesToRemove: string[]): Promise<import("@kbn/ml-common-types/saved_objects").SavedObjectResult>;
        };
        trainedModels: {
            getTrainedModelDownloads(): Promise<import("@kbn/ml-trained-models-utils").ModelDefinitionResponse[]>;
            getElserConfig(options?: import("@kbn/ml-trained-models-utils").GetModelDownloadConfigOptions): Promise<import("@kbn/ml-trained-models-utils").ModelDefinitionResponse>;
            getTrainedModels(modelId?: string | string[], params?: import("@kbn/ml-common-types/trained_models").InferenceQueryParams): Promise<import("@kbn/ml-common-types/trained_models").TrainedModelConfigResponse[]>;
            getTrainedModelsList(): Promise<import("@kbn/ml-common-types/trained_models").TrainedModelUIItem[]>;
            getTrainedModelStats(modelId?: string | string[], params?: import("@kbn/ml-common-types/trained_models").InferenceStatsQueryParams): Promise<import("@kbn/ml-common-types/trained_models").InferenceStatsResponse>;
            getTrainedModelPipelines(modelId: string | string[]): Promise<import("@kbn/ml-common-types/trained_models").ModelPipelines[]>;
            getAllIngestPipelines(): Promise<string[]>;
            createInferencePipeline(pipelineName: string, pipeline: import("@elastic/elasticsearch/lib/api/types").IngestPipeline): Promise<import("@elastic/elasticsearch/lib/api/types").IngestSimulateResponse>;
            deleteTrainedModel({ modelId, options, }: import("@kbn/ml-common-types/trained_models").DeleteModelParams): Promise<{
                acknowledge: boolean;
            }>;
            getCuratedModelConfig(modelName: string, options?: import("@kbn/ml-trained-models-utils").GetModelDownloadConfigOptions): Promise<import("@kbn/ml-trained-models-utils").ModelDefinitionResponse>;
            getTrainedModelsNodesOverview(): Promise<import("@kbn/ml-common-types/trained_models").NodesOverviewResponse>;
            startModelAllocation({ modelId, deploymentParams, adaptiveAllocationsParams, }: import("@kbn/ml-common-types/trained_models").StartAllocationParams): import("rxjs").Observable<import("@kbn/ml-common-types/trained_models").StartTrainedModelDeploymentResponse>;
            stopModelAllocation(modelId: string, deploymentsIds: string[], options?: {
                force: boolean;
            }): Promise<Record<string, {
                acknowledge: boolean;
                error?: import("@kbn/ml-error-utils").ErrorType;
            }>>;
            updateModelDeployment(modelId: string, deploymentId: string, params: import("@kbn/ml-common-types/trained_models").UpdateAllocationParams): Promise<import("@elastic/elasticsearch/lib/api/types").MlUpdateTrainedModelDeploymentResponse>;
            inferTrainedModel(modelId: string, deploymentsId: string, payload: Omit<import("@elastic/elasticsearch/lib/api/types").MlInferTrainedModelRequest, "model_id">, timeout?: string): Promise<import("@elastic/elasticsearch/lib/api/types").MlInferTrainedModelResponse>;
            trainedModelPipelineSimulate(pipeline: import("@elastic/elasticsearch/lib/api/types").IngestPipeline, docs: import("@elastic/elasticsearch/lib/api/types").IngestDocument[]): Promise<import("@elastic/elasticsearch/lib/api/types").IngestSimulateResponse>;
            memoryUsage(type?: import("@kbn/ml-common-types/saved_objects").MlSavedObjectType, node?: string, showClosedJobs?: boolean): Promise<import("@kbn/ml-common-types/trained_models").MemoryUsageInfo[]>;
            putTrainedModelConfig(modelId: string, config: object): Promise<import("@elastic/elasticsearch/lib/api/types").MlTrainedModelConfig>;
            installElasticTrainedModelConfig(modelId: string): Promise<import("@elastic/elasticsearch/lib/api/types").MlTrainedModelConfig>;
            getModelsDownloadStatus(): Promise<Record<string, import("@kbn/ml-common-types/trained_models").ModelDownloadState>>;
        };
        inferenceModels: {
            getAllInferenceEndpoints(): Promise<import("@elastic/elasticsearch/lib/api/types").InferenceGetResponse>;
        };
        notifications: {
            findMessages(params: import("@kbn/ml-common-types/notifications").NotificationsQueryParams): Promise<import("@kbn/ml-common-types/notifications").NotificationsSearchResponse>;
            countMessages$(params: import("@kbn/ml-common-types/notifications").NotificationsCountQueryParams): import("rxjs").Observable<import("@kbn/ml-common-types/notifications").NotificationsCountResponse>;
        };
        jsonSchema: {
            getSchemaDefinition(params: import("./ml_api_service/json_schema").GetSchemaDefinitionParams): Promise<object>;
        };
    };
};
