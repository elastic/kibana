import type { ConnectorSpec } from '@kbn/connector-specs';
import type { ActionTypeParams, ActionTypeSecrets, ActionTypeConfig, ActionType } from '../../types';
import type { PluginSetupContract as ActionsPluginSetupContract } from '../../plugin';
export declare const createConnectorTypeFromSpec: (spec: ConnectorSpec, actions: ActionsPluginSetupContract) => ActionType<ActionTypeConfig, ActionTypeSecrets, ActionTypeParams, unknown>;
