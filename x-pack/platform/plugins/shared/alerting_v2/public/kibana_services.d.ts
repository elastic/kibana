import type { Container } from 'inversify';
import type { RuleFormServices } from '@kbn/alerting-v2-rule-form';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
/**
 * The subset of `PluginConfig` exposed to the browser via `exposeToBrowser` in
 * `server/index.ts`. Declared separately from the server `PluginConfig` type
 * since only the listed keys are actually present on the client at runtime.
 */
export interface AlertingV2UIConfig {
    rules: {
        minimumScheduleInterval: string;
    };
}
/** Services shared by rule UI, episodes UI, and other alerting_v2 surfaces. */
export type AlertingV2KibanaServices = RuleFormServices & {
    expressions: ExpressionsStart;
    uiSettings: IUiSettingsClient;
    container: Container;
};
export declare const untilPluginStartServicesReady: () => Promise<AlertingV2KibanaServices>;
export declare const setKibanaServices: (services: AlertingV2KibanaServices) => void;
