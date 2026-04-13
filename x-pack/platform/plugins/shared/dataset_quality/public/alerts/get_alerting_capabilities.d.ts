import type { Capabilities } from '@kbn/core/public';
import type { PluginStartContract as AlertingPublicStart } from '@kbn/alerting-plugin/public/plugin';
export declare const getAlertingCapabilities: (alerting: AlertingPublicStart | undefined, capabilities: Capabilities) => {
    isAlertingAvailable: boolean;
};
