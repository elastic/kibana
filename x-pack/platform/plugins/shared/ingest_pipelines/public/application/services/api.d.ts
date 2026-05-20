import type { HttpSetup, ResponseErrorBody } from '@kbn/core/public';
import type { PipelineTreeNode } from '@kbn/ingest-pipelines-shared';
import type { FieldCopyAction, GeoipDatabase, Pipeline } from '../../../common/types';
import type { SendRequestResponse, Error as _Error } from '../../shared_imports';
import type { UiMetricService } from './ui_metric';
export declare class ApiService {
    private client;
    private uiMetricService;
    private useRequest;
    private sendRequest;
    private trackUiMetric;
    setup(httpClient: HttpSetup, uiMetricService: UiMetricService): void;
    useLoadPipelines(): import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<Pipeline[], _Error>;
    useLoadPipeline(name: string): import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<Pipeline, _Error>;
    useLoadPipelineTree(name: string): import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<{
        pipelineStructureTree: PipelineTreeNode;
    }, _Error>;
    createPipeline(pipeline: Pipeline): Promise<SendRequestResponse<any, Error>>;
    updatePipeline(pipeline: Pipeline): Promise<SendRequestResponse<any, Error>>;
    deletePipelines(names: string[]): Promise<SendRequestResponse<any, Error>>;
    simulatePipeline(reqBody: {
        documents: object[];
        verbose?: boolean;
        pipeline: Pick<Pipeline, 'processors' | 'on_failure'>;
    }): Promise<SendRequestResponse<any, Error>>;
    loadDocument(index: string, id: string): Promise<SendRequestResponse<any, Error>>;
    parseCsv(reqBody: {
        file: string;
        copyAction: FieldCopyAction;
    }): Promise<SendRequestResponse<any, Error>>;
    useLoadDatabases(): import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GeoipDatabase[], ResponseErrorBody>;
    createDatabase(database: {
        databaseType: string;
        maxmind?: string;
        databaseName: string;
    }): Promise<SendRequestResponse<any, Error>>;
    deleteDatabase(id: string): Promise<SendRequestResponse<any, Error>>;
    useLoadManageProcessorsPrivileges(): import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<{
        hasAllPrivileges: boolean;
    }, _Error>;
}
export declare const apiService: ApiService;
