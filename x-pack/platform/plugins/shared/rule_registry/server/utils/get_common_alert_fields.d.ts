import type { RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import type { CommonAlertFieldsLatest } from '../../common/schemas';
export declare const getCommonAlertFields: (options: RuleExecutorOptions<any, any, any, any, any>, dangerouslyCreateAlertsInAllSpaces?: boolean) => CommonAlertFieldsLatest;
