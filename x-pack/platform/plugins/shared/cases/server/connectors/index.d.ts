import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import type { ServerlessProjectType } from '../../common/constants/types';
import type { CasesClient } from '../client';
export type * from './types';
export { casesConnectors } from './factory';
export declare function registerConnectorTypes({ alerting, actions, core, logger, getCasesClient, getSpaceId, serverlessProjectType, isCasesAttachmentsEnabled, }: {
    actions: ActionsPluginSetupContract;
    alerting: AlertingServerSetup;
    core: CoreSetup;
    logger: Logger;
    getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;
    getSpaceId: (request?: KibanaRequest) => string;
    serverlessProjectType?: ServerlessProjectType;
    isCasesAttachmentsEnabled: boolean;
}): void;
