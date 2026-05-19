import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { Observable } from 'rxjs';
import type { AlertInstanceContext, AlertInstanceState, IRuleTypeAlerts, RuleAlertData, DataStreamAdapter } from '../types';
import type { InitializationPromise } from './create_resource_installation_helper';
import type { LegacyAlertsClientParams, AlertRuleData } from '../alerts_client';
import type { IAlertsClient } from '../alerts_client/types';
import type { SetAlertsToUntrackedParams } from './lib/set_alerts_to_untracked';
import type { ClearAlertFlappingHistoryParams } from './lib/clear_alert_flapping_history';
import type { IsExistingAlertParams } from './lib/is_existing_alert';
export declare const TOTAL_FIELDS_LIMIT = 2500;
export declare const ECS_CONTEXT = "ecs";
export declare const ECS_COMPONENT_TEMPLATE_NAME: string;
interface AlertsServiceParams {
    logger: Logger;
    pluginStop$: Observable<void>;
    kibanaVersion: string;
    elasticsearchClientPromise: Promise<ElasticsearchClient>;
    timeoutMs?: number;
    dataStreamAdapter: DataStreamAdapter;
    elasticsearchAndSOAvailability$: Observable<boolean>;
    isServerless: boolean;
}
export interface CreateAlertsClientParams extends LegacyAlertsClientParams {
    namespace: string;
    rule: AlertRuleData;
}
export type MuteInstances = Array<{
    ruleId: string;
    alertInstanceIds?: string[];
}>;
interface IAlertsService {
    /**
     * Register solution specific resources. If common resource initialization is
     * complete, go ahead and install those resources, otherwise add to queue to
     * await initialization
     *
     * Solution specific resources include:
     * - Component template - solution specific mappings for fields used only by solution rule types
     * - Index templates - solution specific template that combines common and solution specific component templates
     * - Concrete write index - solution specific write index
     */
    register(opts: IRuleTypeAlerts, timeoutMs?: number): void;
    isInitialized(): boolean;
    /**
     * Returns promise that resolves when the resources for the given
     * context in the given namespace are installed. These include the context specific component template,
     * the index template for the default namespace and the concrete write index
     * for the default namespace.
     */
    getContextInitializationPromise(context: string, namespace: string): Promise<InitializationPromise>;
    /**
     * If the rule type has registered an alert context, initialize and return an AlertsClient,
     * otherwise return null. Currently registering an alert context is optional but in the future
     * we will make it a requirement for all rule types and this function should not return null.
     */
    createAlertsClient<AlertData extends RuleAlertData, LegacyState extends AlertInstanceState, LegacyContext extends AlertInstanceContext, ActionGroupIds extends string, RecoveryActionGroupId extends string>(opts: CreateAlertsClientParams): Promise<IAlertsClient<AlertData, LegacyState, LegacyContext, ActionGroupIds, RecoveryActionGroupId> | null>;
}
export type PublicAlertsService = Pick<IAlertsService, 'getContextInitializationPromise'>;
export type PublicFrameworkAlertsService = PublicAlertsService & {
    enabled: () => boolean;
};
export declare class AlertsService implements IAlertsService {
    private readonly options;
    private initialized;
    private isServerless;
    private isInitializing;
    private resourceInitializationHelper;
    private registeredContexts;
    private commonInitPromise;
    private dataStreamAdapter;
    constructor(options: AlertsServiceParams);
    isInitialized(): boolean;
    createAlertsClient<AlertData extends RuleAlertData, LegacyState extends AlertInstanceState, LegacyContext extends AlertInstanceContext, ActionGroupIds extends string, RecoveryActionGroupId extends string>(opts: CreateAlertsClientParams): Promise<IAlertsClient<AlertData, LegacyState, LegacyContext, ActionGroupIds, RecoveryActionGroupId> | null>;
    getContextInitializationPromise(context: string, namespace: string): Promise<InitializationPromise>;
    register(opts: IRuleTypeAlerts, timeoutMs?: number): void;
    /**
     * Initializes the common ES resources needed for framework alerts as data
     * - ILM policy - common policy shared by all AAD indices
     * - Component template - common mappings for fields populated and used by the framework
     */
    private initializeCommon;
    private initializeContext;
    setAlertsToUntracked(opts: SetAlertsToUntrackedParams): Promise<{
        "kibana.alert.rule.uuid": string;
        "kibana.alert.uuid": string;
    }[]>;
    clearAlertFlappingHistory(opts: ClearAlertFlappingHistoryParams): Promise<never[] | undefined>;
    isExistingAlert(params: IsExistingAlertParams): Promise<boolean>;
    private _updateMuteState;
    muteAlertInstance({ ruleId, alertInstanceId, indices, logger, }: {
        ruleId: string;
        alertInstanceId: string;
        indices: string[];
        logger: Logger;
    }): Promise<void>;
    unmuteAlertInstance({ ruleId, alertInstanceId, indices, logger, }: {
        ruleId: string;
        alertInstanceId: string;
        indices: string[];
        logger: Logger;
    }): Promise<void>;
    muteAllAlerts({ ruleId, indices, logger, }: {
        ruleId: string;
        indices: string[];
        logger: Logger;
    }): Promise<void>;
    unmuteAllAlerts({ ruleId, indices, logger, }: {
        ruleId: string;
        indices: string[];
        logger: Logger;
    }): Promise<void>;
    muteAlertInstances({ targets, indices, logger, }: {
        targets: MuteInstances;
        indices: string[];
        logger: Logger;
    }): Promise<void>;
    unmuteAlertInstances({ targets, indices, logger, }: {
        targets: MuteInstances;
        indices: string[];
        logger: Logger;
    }): Promise<void>;
}
export {};
