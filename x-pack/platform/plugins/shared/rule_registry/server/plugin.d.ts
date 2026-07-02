import type { PluginInitializerContext, Plugin, CoreSetup, KibanaRequest, CoreStart } from '@kbn/core/server';
import type { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { PluginStart as DataPluginStart, PluginSetup as DataPluginSetup } from '@kbn/data-plugin/server';
import { type IRuleDataService, Dataset } from './rule_data_plugin_service';
import type { AlertsClient } from './alert_data_client/alerts_client';
export interface RuleRegistryPluginSetupDependencies {
    security?: SecurityPluginSetup;
    data: DataPluginSetup;
    alerting: AlertingServerSetup;
}
export interface RuleRegistryPluginStartDependencies {
    alerting: AlertingServerStart;
    data: DataPluginStart;
    spaces?: SpacesPluginStart;
}
export interface RuleRegistryPluginSetupContract {
    ruleDataService: IRuleDataService;
    dataset: typeof Dataset;
}
export interface RuleRegistryPluginStartContract {
    getRacClientWithRequest: (req: KibanaRequest) => Promise<AlertsClient>;
    alerting: AlertingServerStart;
}
export declare class RuleRegistryPlugin implements Plugin<RuleRegistryPluginSetupContract, RuleRegistryPluginStartContract, RuleRegistryPluginSetupDependencies, RuleRegistryPluginStartDependencies> {
    private readonly config;
    private readonly logger;
    private readonly kibanaVersion;
    private readonly alertsClientFactory;
    private ruleDataService;
    private security;
    private pluginStop$;
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup<RuleRegistryPluginStartDependencies, RuleRegistryPluginStartContract>, plugins: RuleRegistryPluginSetupDependencies): RuleRegistryPluginSetupContract;
    start(core: CoreStart, plugins: RuleRegistryPluginStartDependencies): RuleRegistryPluginStartContract;
    private createRouteHandlerContext;
    stop(): void;
}
