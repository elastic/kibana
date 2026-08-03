import type { estypes } from '@elastic/elasticsearch';
import type { DataViewLazy, DataViewsContract, FieldSpec } from '@kbn/data-views-plugin/common';
import type { LogSourcesService } from '@kbn/logs-data-access-plugin/common/services/log_sources_service/types';
import type { LogViewAttributes, LogViewColumnConfiguration, LogViewsStaticConfig } from './types';
export type ResolvedLogViewField = FieldSpec;
export interface ResolvedLogView<DataViewReference = DataViewLazy> {
    name: string;
    description: string;
    indices: string;
    timestampField: string;
    tiebreakerField: string;
    messageField: string[];
    runtimeMappings: estypes.MappingRuntimeFields;
    columns: LogViewColumnConfiguration[];
    dataViewReference: DataViewReference;
}
export declare const resolveLogView: (logViewId: string, logViewAttributes: LogViewAttributes, dataViewsService: DataViewsContract, logSourcesService: LogSourcesService, config: LogViewsStaticConfig) => Promise<ResolvedLogView>;
