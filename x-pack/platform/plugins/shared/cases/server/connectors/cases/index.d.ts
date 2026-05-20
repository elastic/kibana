import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { IUiSettingsClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ConnectorAdapter } from '@kbn/alerting-plugin/server';
import type { ServerlessProjectType } from '../../../common/constants/types';
import type { CasesConnectorConfig, CasesConnectorParams, CasesConnectorRuleActionParams, CasesConnectorSecrets } from './types';
import type { CasesClient } from '../../client';
interface GetCasesConnectorTypeArgs {
    getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;
    getUnsecuredSavedObjectsClient: (request: KibanaRequest, savedObjectTypes: string[]) => Promise<SavedObjectsClientContract>;
    getUiSettingsClient: (request: KibanaRequest) => Promise<IUiSettingsClient>;
    getSpaceId: (request?: KibanaRequest) => string;
    serverlessProjectType?: string;
    isCasesAttachmentsEnabled: boolean;
}
export declare const getCasesConnectorType: ({ getCasesClient, getSpaceId, getUnsecuredSavedObjectsClient, getUiSettingsClient, serverlessProjectType, isCasesAttachmentsEnabled, }: GetCasesConnectorTypeArgs) => SubActionConnectorType<CasesConnectorConfig, CasesConnectorSecrets>;
export declare const getCasesConnectorAdapter: ({ serverlessProjectType, logger, }: {
    serverlessProjectType?: ServerlessProjectType;
    isServerlessSecurity?: boolean;
    logger: Logger;
}) => ConnectorAdapter<CasesConnectorRuleActionParams, CasesConnectorParams>;
export {};
