import { type RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import { type DataFrameAnalyticsMeta, type DataFrameAnalyticsConfig, type DataFrameAnalyticsId, type DataFrameAnalysisConfigType, type FeatureProcessor } from '@kbn/ml-data-frame-analytics-utils';
import type { DeepPartial } from '@kbn/utility-types';
import type { DeepReadonly } from '@kbn/ml-common-types/common';
import type { CloneDataFrameAnalyticsConfig } from '../../components/action_clone';
export declare enum DEFAULT_MODEL_MEMORY_LIMIT {
    regression = "100mb",
    outlier_detection = "50mb",
    classification = "100mb"
}
export declare const DEFAULT_NUM_TOP_FEATURE_IMPORTANCE_VALUES = 0;
export declare const DEFAULT_MAX_NUM_THREADS = 1;
export declare const UNSET_CONFIG_ITEM = "--";
export type EsIndexName = string;
export type DependentVariable = string;
export type DataViewTitle = string;
export type AnalyticsJobType = DataFrameAnalysisConfigType | undefined;
type DataViewId = string;
export type SourceIndexMap = Record<DataViewTitle, {
    label: DataViewTitle;
    value: DataViewId;
}>;
export interface FormMessage {
    error?: string;
    message: string;
}
export interface State {
    advancedEditorMessages: FormMessage[];
    advancedEditorRawString: string;
    disableSwitchToForm: boolean;
    form: {
        alpha: undefined | number;
        computeFeatureInfluence: boolean;
        createDataView: boolean;
        classAssignmentObjective: undefined | string;
        dependentVariable: DependentVariable;
        description: string;
        destinationIndex: EsIndexName;
        destinationIndexNameExists: boolean;
        destinationIndexNameEmpty: boolean;
        destinationIndexNameValid: boolean;
        destinationDataViewTitleExists: boolean;
        downsampleFactor: undefined | number;
        earlyStoppingEnabled: undefined | boolean;
        eta: undefined | number;
        etaGrowthRatePerTree: undefined | number;
        featureBagFraction: undefined | number;
        featureInfluenceThreshold: undefined | number;
        featureProcessors: undefined | FeatureProcessor[];
        gamma: undefined | number;
        includes: string[];
        jobId: DataFrameAnalyticsId;
        jobIdExists: boolean;
        jobIdEmpty: boolean;
        jobIdInvalidMaxLength: boolean;
        jobIdValid: boolean;
        jobType: AnalyticsJobType;
        jobConfigQuery: any;
        jobConfigQueryString: string | undefined;
        jobConfigQueryLanguage: string | undefined;
        lambda: number | undefined;
        lossFunction: string | undefined;
        lossFunctionParameter: number | undefined;
        loadingFieldOptions: boolean;
        maxNumThreads: undefined | number;
        maxOptimizationRoundsPerHyperparameter: undefined | number;
        maxTrees: undefined | number;
        _meta: undefined | DataFrameAnalyticsMeta;
        method: undefined | string;
        modelMemoryLimit: string | undefined;
        modelMemoryLimitUnitValid: boolean;
        modelMemoryLimitValidationResult: any;
        nNeighbors: undefined | number;
        numTopFeatureImportanceValues: number | undefined;
        numTopFeatureImportanceValuesValid: boolean;
        numTopClasses: number;
        outlierFraction: undefined | number;
        predictionFieldName: undefined | string;
        previousJobType: null | AnalyticsJobType;
        requiredFieldsError: string | undefined;
        randomizeSeed: undefined | number;
        resultsField: undefined | string;
        runtimeMappings: undefined | RuntimeMappings;
        runtimeMappingsUpdated: boolean;
        previousRuntimeMapping: undefined | RuntimeMappings;
        softTreeDepthLimit: undefined | number;
        softTreeDepthTolerance: undefined | number;
        sourceIndex: EsIndexName;
        sourceIndexNameEmpty: boolean;
        sourceIndexNameValid: boolean;
        sourceIndexContainsNumericalFields: boolean;
        sourceIndexFieldsCheckFailed: boolean;
        standardizationEnabled: undefined | boolean;
        timeFieldName: undefined | string;
        trainingPercent: number;
        useEstimatedMml: boolean;
    };
    disabled: boolean;
    dataViewsMap: SourceIndexMap;
    isAdvancedEditorEnabled: boolean;
    isAdvancedEditorValidJson: boolean;
    hasSwitchedToEditor: boolean;
    isJobCreated: boolean;
    isJobStarted: boolean;
    isValid: boolean;
    jobConfig: DeepPartial<DataFrameAnalyticsConfig>;
    jobIds: DataFrameAnalyticsId[];
    requestMessages: FormMessage[];
    estimatedModelMemoryLimit: string;
    cloneJob?: DeepReadonly<DataFrameAnalyticsConfig>;
}
export declare const getInitialState: () => State;
export declare const getJobConfigFromFormState: (formState: State["form"]) => DeepPartial<DataFrameAnalyticsConfig>;
/**
 * Extracts form state for a job clone from the analytics job configuration.
 * For cloning we keep job id and destination index empty.
 */
export declare function getFormStateFromJobConfig(analyticsJobConfig: Readonly<CloneDataFrameAnalyticsConfig>, isClone?: boolean): Partial<State['form']>;
export {};
