import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ExecutorType } from '../types';
import type { ExecutorParams, SubActionConnectorType } from './types';
export declare const buildExecutor: <Config extends Record<string, unknown>, Secrets extends Record<string, unknown>>({ configurationUtilities, connector, logger, }: {
    connector: SubActionConnectorType<Config, Secrets>;
    logger: Logger;
    configurationUtilities: ActionsConfigurationUtilities;
}) => ExecutorType<Config, Secrets, ExecutorParams, unknown>;
