import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { IUiSettingsClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { CasesConnectorConfig, CasesConnectorRunParams, CasesConnectorSecrets } from './types';
import type { CasesClient } from '../../client';
interface CasesConnectorParams {
    connectorParams: ServiceParams<CasesConnectorConfig, CasesConnectorSecrets>;
    casesParams: {
        getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;
        getSpaceId: (request?: KibanaRequest) => string;
        getUnsecuredSavedObjectsClient: (request: KibanaRequest, savedObjectTypes: string[]) => Promise<SavedObjectsClientContract>;
        getUiSettingsClient: (request: KibanaRequest) => Promise<IUiSettingsClient>;
        isCasesAttachmentsEnabled: boolean;
    };
}
export declare class CasesConnector extends SubActionConnector<CasesConnectorConfig, CasesConnectorSecrets> {
    private readonly casesService;
    private readonly retryService;
    private readonly casesParams;
    constructor({ connectorParams, casesParams }: CasesConnectorParams);
    private registerSubActions;
    /**
     * Method is not needed for the Case Connector.
     * The function throws an error as a reminder to
     * implement it if we need it in the future.
     */
    protected getResponseErrorMessage(): string;
    run(params: CasesConnectorRunParams): Promise<void>;
    private _run;
    private getValidatedRunParams;
    private handleError;
    private logDebugCurrentState;
    private logError;
}
export {};
