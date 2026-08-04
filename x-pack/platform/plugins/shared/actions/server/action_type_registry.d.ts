import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { ActionType as CommonActionType } from '../common';
import type { ActionsConfigurationUtilities } from './actions_config';
import type { ActionExecutionSourceType, ILicenseState, TaskRunnerFactory } from './lib';
import type { ActionType, ActionTypeConfig, ActionTypeParams, ActionTypeSecrets, InMemoryConnector } from './types';
export interface ActionTypeRegistryOpts {
    licensing: LicensingPluginSetup;
    taskManager: TaskManagerSetupContract;
    taskRunnerFactory: TaskRunnerFactory;
    actionsConfigUtils: ActionsConfigurationUtilities;
    licenseState: ILicenseState;
    inMemoryConnectors: InMemoryConnector[];
}
interface ListOpts {
    featureId?: string;
    exposeValidation?: boolean;
}
export declare class ActionTypeRegistry {
    private readonly taskManager;
    private readonly actionTypes;
    private readonly taskRunnerFactory;
    private readonly actionsConfigUtils;
    private readonly licenseState;
    private readonly inMemoryConnectors;
    private readonly licensing;
    constructor(constructorParams: ActionTypeRegistryOpts);
    /**
     * Returns if the action type registry has the given action type registered
     */
    has(id: string): boolean;
    /**
     * Throws error if action type is not enabled.
     */
    ensureActionTypeEnabled(id: string): void;
    /**
     * Returns true if action type is enabled in the config and a valid license is used.
     */
    isActionTypeEnabled(id: string, options?: {
        notifyUsage: boolean;
    }): boolean;
    /**
     * Returns true if action type is enabled or preconfigured.
     * An action type can be disabled but used with a preconfigured action.
     * This does not apply to system actions as those can be disabled.
     */
    isActionExecutable(actionId: string, actionTypeId: string, options?: {
        notifyUsage: boolean;
    }): boolean;
    /**
     * Returns true if the action type is a system action type
     */
    isSystemActionType: (actionTypeId: string) => boolean;
    /**
     * Returns true if the connector type has a sub-feature type defined
     */
    hasSubFeature: (actionTypeId: string) => boolean;
    /**
     * Returns the kibana privileges
     */
    getActionKibanaPrivileges<Params extends ActionTypeParams = ActionTypeParams>(actionTypeId: string, params?: Params, source?: ActionExecutionSourceType): string[];
    /**
     * Registers an action type to the action type registry
     */
    register<Config extends ActionTypeConfig = ActionTypeConfig, Secrets extends ActionTypeSecrets = ActionTypeSecrets, Params extends ActionTypeParams = ActionTypeParams, ExecutorResultData = void>(actionType: ActionType<Config, Secrets, Params, ExecutorResultData>): void;
    /**
     * Returns an action type, throws if not registered
     */
    get<Config extends ActionTypeConfig = ActionTypeConfig, Secrets extends ActionTypeSecrets = ActionTypeSecrets, Params extends ActionTypeParams = ActionTypeParams, ExecutorResultData = void>(id: string): ActionType<Config, Secrets, Params, ExecutorResultData>;
    /**
     * Returns a list of registered action types [{ id, name, enabled }], filtered by featureId if provided.
     */
    list({ featureId, exposeValidation }?: ListOpts): CommonActionType[];
    /**
     * Returns the actions configuration utilities
     */
    getUtils(): ActionsConfigurationUtilities;
    getAllTypes(): string[];
    isDeprecated(actionTypeId: string): boolean;
}
export {};
