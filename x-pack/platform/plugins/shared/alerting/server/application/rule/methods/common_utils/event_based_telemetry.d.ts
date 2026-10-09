import type { AnalyticsServiceStart, EventTypeOpts, Logger } from '@kbn/core/server';
interface ReportEventContext {
    analytics?: Pick<AnalyticsServiceStart, 'reportEvent'>;
    logger: Logger;
}
export interface RuleCreatedEventData {
    rule_id: string;
    template_id?: string;
    created_at: string;
    rule_type_id: string;
    enabled: boolean;
    consumer: string;
    producer: string;
}
export declare const RULE_CREATED_EVENT: EventTypeOpts<RuleCreatedEventData>;
export declare const ruleCreateTelemetryEvents: Array<EventTypeOpts<Record<string, unknown>>>;
export declare function reportRuleCreatedEvent(context: ReportEventContext, { id, templateId, createTime, alertTypeId, enabled, consumer, producer, }: {
    id: string;
    templateId?: string;
    createTime: number;
    alertTypeId: string;
    enabled: boolean;
    consumer: string;
    producer: string;
}): void;
export {};
