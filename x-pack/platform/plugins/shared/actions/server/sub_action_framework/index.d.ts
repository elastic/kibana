import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ActionTypeRegistry } from '../action_type_registry';
import type { SubActionConnectorType } from './types';
import type { ActionTypeConfig, ActionTypeSecrets } from '../types';
export declare const createSubActionConnectorFramework: ({ actionsConfigUtils: configurationUtilities, actionTypeRegistry, logger, }: {
    actionTypeRegistry: PublicMethodsOf<ActionTypeRegistry>;
    logger: Logger;
    actionsConfigUtils: ActionsConfigurationUtilities;
}) => {
    registerConnector: <Config extends ActionTypeConfig, Secrets extends ActionTypeSecrets>(connector: SubActionConnectorType<Config, Secrets>) => void;
};
