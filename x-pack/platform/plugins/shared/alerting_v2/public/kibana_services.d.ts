import type { RuleFormServices } from '@kbn/alerting-v2-rule-form';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
/** Services shared by rule UI, episodes UI, and other alerting_v2 surfaces. */
export type AlertingV2KibanaServices = RuleFormServices & {
    expressions: ExpressionsStart;
    uiActions: UiActionsStart;
};
export declare const untilPluginStartServicesReady: () => Promise<AlertingV2KibanaServices>;
export declare const setKibanaServices: (services: AlertingV2KibanaServices) => void;
