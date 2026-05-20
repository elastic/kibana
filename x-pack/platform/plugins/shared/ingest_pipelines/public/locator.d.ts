import type { SerializableRecord } from '@kbn/utility-types';
import type { ManagementAppLocator } from '@kbn/management-plugin/common';
import type { LocatorPublic, LocatorDefinition, KibanaLocation } from '@kbn/share-plugin/public';
export declare enum INGEST_PIPELINES_PAGES {
    LIST = "pipelines_list",
    EDIT = "pipeline_edit",
    CREATE = "pipeline_create",
    CLONE = "pipeline_clone"
}
interface IngestPipelinesBaseParams extends SerializableRecord {
    pipelineId: string;
}
export interface IngestPipelinesListParams extends Partial<IngestPipelinesBaseParams> {
    page: INGEST_PIPELINES_PAGES.LIST;
}
export interface IngestPipelinesEditParams extends IngestPipelinesBaseParams {
    page: INGEST_PIPELINES_PAGES.EDIT;
}
export interface IngestPipelinesCloneParams extends IngestPipelinesBaseParams {
    page: INGEST_PIPELINES_PAGES.CLONE;
}
export interface IngestPipelinesCreateParams extends IngestPipelinesBaseParams {
    page: INGEST_PIPELINES_PAGES.CREATE;
}
export type IngestPipelinesParams = IngestPipelinesListParams | IngestPipelinesEditParams | IngestPipelinesCloneParams | IngestPipelinesCreateParams;
export type IngestPipelinesLocator = LocatorPublic<IngestPipelinesParams>;
export declare const INGEST_PIPELINES_APP_LOCATOR = "INGEST_PIPELINES_APP_LOCATOR";
export interface IngestPipelinesLocatorDependencies {
    managementAppLocator: ManagementAppLocator;
}
export declare class IngestPipelinesLocatorDefinition implements LocatorDefinition<IngestPipelinesParams> {
    protected readonly deps: IngestPipelinesLocatorDependencies;
    readonly id = "INGEST_PIPELINES_APP_LOCATOR";
    constructor(deps: IngestPipelinesLocatorDependencies);
    readonly getLocation: (params: IngestPipelinesParams) => Promise<KibanaLocation>;
}
export {};
