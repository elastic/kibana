import type { HttpSetup } from '@kbn/core/public';
import type { CreateAutoImportIntegrationResponse, GetAutoImportIntegrationResponse, GetAllAutoImportIntegrationsResponse } from '../../../common/model/api/integrations/integration.gen';
import type { UploadSamplesToDataStreamResponse } from '../../../common/model/api/data_streams/data_stream.gen';
import type { DataStream, OriginalSource } from '../../../common/model/common_attributes.gen';
import type { LangSmithOptions } from './lang_smith';
export declare const FLEET_PACKAGES_PATH = "/api/fleet/epm/packages";
export declare const AUTOMATIC_IMPORT_INTEGRATIONS_PATH = "/api/automatic_import/integrations";
export interface RequestDeps {
    http: HttpSetup;
    abortSignal?: AbortSignal;
}
export interface EpmPackageResponse {
    items: Array<{
        id: string;
        type: string;
    }>;
    _meta?: {
        install_source: string;
        name: string;
    };
}
export declare const runInstallPackage: (zipFile: Blob, { http, abortSignal }: RequestDeps) => Promise<EpmPackageResponse>;
export declare const getInstalledPackages: ({ http, abortSignal, }: RequestDeps) => Promise<EpmPackageResponse>;
export interface CreateUpdateIntegrationRequest {
    connectorId: string;
    integrationId: string;
    title: string;
    description: string;
    logo?: string;
    dataStreams?: DataStream[];
    langSmithOptions?: LangSmithOptions;
}
export declare const createIntegration: ({ http, abortSignal, ...body }: RequestDeps & CreateUpdateIntegrationRequest) => Promise<CreateAutoImportIntegrationResponse>;
export declare const getIntegrationById: ({ http, abortSignal, integrationId, }: RequestDeps & {
    integrationId: string;
}) => Promise<GetAutoImportIntegrationResponse>;
export declare const getAllIntegrations: ({ http, abortSignal, }: RequestDeps) => Promise<GetAllAutoImportIntegrationsResponse>;
export interface DeleteIntegrationRequest {
    integrationId: string;
}
export declare const deleteIntegration: ({ http, integrationId, }: RequestDeps & DeleteIntegrationRequest) => Promise<void>;
export interface UploadSamplesRequest {
    integrationId: string;
    dataStreamId: string;
    samples?: string[];
    sourceIndex?: string;
    originalSource: OriginalSource;
}
export declare const uploadSamplesToDataStream: ({ http, abortSignal, integrationId, dataStreamId, samples, sourceIndex, originalSource, }: RequestDeps & UploadSamplesRequest) => Promise<UploadSamplesToDataStreamResponse>;
export interface DeleteDataStreamRequest {
    integrationId: string;
    dataStreamId: string;
}
export declare const deleteDataStream: ({ http, integrationId, dataStreamId, }: RequestDeps & DeleteDataStreamRequest) => Promise<void>;
export interface ReanalyzeDataStreamRequest {
    integrationId: string;
    dataStreamId: string;
    connectorId: string;
}
export interface ReanalyzeDataStreamResponse {
    success: boolean;
}
export declare const reanalyzeDataStream: ({ http, abortSignal, integrationId, dataStreamId, connectorId, }: RequestDeps & ReanalyzeDataStreamRequest) => Promise<ReanalyzeDataStreamResponse>;
export interface GetDataStreamResultsRequest {
    integrationId: string;
    dataStreamId: string;
}
export interface GetDataStreamResultsResponse {
    ingest_pipeline: Record<string, unknown>;
    results: Array<Record<string, unknown>>;
}
export declare const getDataStreamResults: ({ http, abortSignal, integrationId, dataStreamId, }: RequestDeps & GetDataStreamResultsRequest) => Promise<GetDataStreamResultsResponse>;
export interface UpdateDataStreamPipelineRequest {
    integrationId: string;
    dataStreamId: string;
    ingestPipeline: string;
}
export declare const updateDataStreamPipeline: ({ http, abortSignal, integrationId, dataStreamId, ingestPipeline, }: RequestDeps & UpdateDataStreamPipelineRequest) => Promise<GetDataStreamResultsResponse>;
