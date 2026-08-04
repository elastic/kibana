import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import type { LensDocShapePre712, LensDocShapePost712, LensDocShape713, LensDocShape714, LensDocShape715, VisStatePost715, VisStatePre715, VisState716, VisState810, VisState820, VisState830, CustomVisualizationMigrations, LensDocShape810, LensDocShape830, VisStatePre830, XYVisStatePre850, VisState850, LensDocShape850, LensDocShape860 } from './types';
export declare const commonRenameOperationsForFormula: (attributes: LensDocShapePre712) => LensDocShapePost712;
export declare const commonRemoveTimezoneDateHistogramParam: (attributes: LensDocShape713) => LensDocShape714;
export declare const commonUpdateVisLayerType: (attributes: LensDocShape715<VisStatePre715>) => LensDocShape715<VisStatePost715>;
export declare const commonMakeReversePaletteAsCustom: (attributes: LensDocShape715<VisState716>) => LensDocShape715<VisState716>;
export declare const commonRenameRecordsField: (attributes: LensDocShape810) => LensDocShape810;
export declare const commonRenameFilterReferences: (attributes: LensDocShape715) => LensDocShape810;
export declare const commonSetLastValueShowArrayValues: (attributes: LensDocShape810) => LensDocShape810;
export declare const commonEnhanceTableRowHeight: (attributes: LensDocShape810<VisState810>) => LensDocShape810<VisState820>;
export declare const commonSetIncludeEmptyRowsDateHistogram: (attributes: LensDocShape810) => LensDocShape810;
export declare const commonLockOldMetricVisSettings: (attributes: LensDocShape810) => LensDocShape830<VisState830>;
export declare const commonPreserveOldLegendSizeDefault: (attributes: LensDocShape810) => LensDocShape830<VisState830>;
/**
 * This creates a migration map that applies custom visualization migrations
 */
export declare const getLensCustomVisualizationMigrations: (customVisualizationMigrations: CustomVisualizationMigrations) => MigrateFunctionsObject;
/**
 * This creates a migration map that applies filter migrations to Lens visualizations
 */
export declare const getLensFilterMigrations: (filterMigrations: MigrateFunctionsObject) => MigrateFunctionsObject;
export declare const getLensDataViewMigrations: (dataViewMigrations: MigrateFunctionsObject) => MigrateFunctionsObject;
export declare const fixLensTopValuesCustomFormatting: (attributes: LensDocShape810) => LensDocShape810;
export declare const commonFixValueLabelsInXY: (attributes: LensDocShape830<VisStatePre830>) => LensDocShape830<VisState830>;
export declare const commonEnrichAnnotationLayer: (attributes: LensDocShape850<XYVisStatePre850>) => LensDocShape850<VisState850>;
export declare const commonMigrateMetricIds: (attributes: LensDocShape850<unknown>) => LensDocShape850<unknown>;
export declare const commonMigrateIndexPatternDatasource: (attributes: LensDocShape850<unknown>) => LensDocShape860<unknown>;
export declare const commonMigratePartitionChartGroups: (attributes: LensDocShape850<{
    shape: string;
    layers: Array<{
        groups?: string[];
    }>;
}>) => LensDocShape850<{
    shape: string;
    layers: Array<{
        primaryGroups?: string[];
        secondaryGroups?: string[];
        [key: string]: unknown;
    }>;
}>;
export declare const commonMigratePartitionMetrics: (attributes: LensDocShape860<unknown>) => LensDocShape860<unknown>;
export declare const commonMigrateMetricFormatter: (attributes: LensDocShape860<unknown>) => LensDocShape860<unknown>;
