import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ActionTypeConfig, ActionTypeSecrets } from '../types';
import type { ExecutorParams, SubActionConnectorType } from './types';
import type { ValidatorType as ValidationSchema } from '../types';
export declare const buildValidators: <Config extends ActionTypeConfig, Secrets extends ActionTypeSecrets>({ connector, configurationUtilities, }: {
    configurationUtilities: ActionsConfigurationUtilities;
    connector: SubActionConnectorType<Config, Secrets>;
}) => {
    config: ValidationSchema<Config>;
    secrets: ValidationSchema<Secrets>;
    params: ValidationSchema<ExecutorParams>;
};
