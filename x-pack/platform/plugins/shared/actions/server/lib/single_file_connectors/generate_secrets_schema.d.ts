import type { ConnectorSpec } from '@kbn/connector-specs';
import type { ActionTypeSecrets, ValidatorType } from '../../types';
import type { ActionsConfigurationUtilities } from '../../actions_config';
export declare const generateSecretsSchema: (authSpec: ConnectorSpec["auth"], configUtils: ActionsConfigurationUtilities) => ValidatorType<ActionTypeSecrets>;
