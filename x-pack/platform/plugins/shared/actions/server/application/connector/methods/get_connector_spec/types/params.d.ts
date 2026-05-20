import type { ActionsClientContext } from '../../../../../actions_client';
import type { ActionsConfigurationUtilities } from '../../../../../actions_config';
export interface GetConnectorSpecParams {
    context: ActionsClientContext;
    id: string;
    configurationUtilities: ActionsConfigurationUtilities;
}
