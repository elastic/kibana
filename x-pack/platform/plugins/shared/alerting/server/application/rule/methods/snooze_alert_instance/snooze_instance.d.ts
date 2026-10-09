import type { SnoozeAlertInstanceBody, SnoozeAlertInstanceQuery, SnoozeAlertInstanceParams } from './types';
import type { RulesClientContext } from '../../../../rules_client/types';
export declare function snoozeAlertInstance(context: RulesClientContext, { params, query, body, }: {
    params: SnoozeAlertInstanceParams;
    query: SnoozeAlertInstanceQuery;
    body: SnoozeAlertInstanceBody;
}): Promise<void>;
