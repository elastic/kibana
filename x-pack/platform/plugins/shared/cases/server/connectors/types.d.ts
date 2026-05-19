import type { Logger } from '@kbn/core/server';
import type { Case, ConnectorMappings } from '../../common/types/domain';
import type { CasesClientGetAlertsResponse } from '../client/alerts/types';
import type { CasesClientFactory } from '../client/factory';
import type { RegisterActionType } from '../types';
export interface GetActionTypeParams {
    logger: Logger;
    factory: CasesClientFactory;
}
export interface RegisterConnectorsArgs extends GetActionTypeParams {
    registerActionType: RegisterActionType;
}
export interface ICasesConnector<TExternalServiceParams = {}> {
    format: (theCase: Case, alerts: CasesClientGetAlertsResponse) => TExternalServiceParams;
    getMapping: () => ConnectorMappings;
}
export interface CasesConnectorsMap {
    get: (type: string) => ICasesConnector | undefined | null;
}
