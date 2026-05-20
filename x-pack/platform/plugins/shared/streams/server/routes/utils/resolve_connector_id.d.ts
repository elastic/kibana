import type { IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
export declare function resolveConnectorId({ connectorId, uiSettingsClient, logger, request, }: {
    connectorId?: string;
    uiSettingsClient: IUiSettingsClient;
    logger: Logger;
    request?: KibanaRequest;
}): Promise<string>;
