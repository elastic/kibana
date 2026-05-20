import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ActionTypeRegistry } from '../action_type_registry';
import type { ActionTypeConfig, ActionTypeSecrets } from '../types';
import type { SubActionConnectorType } from './types';
export declare const register: <Config extends ActionTypeConfig, Secrets extends ActionTypeSecrets>({ actionTypeRegistry, connector, logger, configurationUtilities, }: {
    configurationUtilities: ActionsConfigurationUtilities;
    actionTypeRegistry: PublicMethodsOf<ActionTypeRegistry>;
    connector: SubActionConnectorType<Config, Secrets>;
    logger: Logger;
}) => void;
