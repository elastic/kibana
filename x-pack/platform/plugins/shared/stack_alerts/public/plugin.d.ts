import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import type { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
export type Setup = void;
export type Start = void;
export interface StackAlertsPublicSetupDeps {
    triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
    alerting: AlertingSetup;
}
export declare class StackAlertsPublicPlugin implements Plugin<Setup, Start, StackAlertsPublicSetupDeps> {
    private readonly isServerless;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup, { triggersActionsUi, alerting }: StackAlertsPublicSetupDeps): void;
    start(): void;
    stop(): void;
}
