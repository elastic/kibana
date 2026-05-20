export interface AlertingActions {
    get(ruleTypeId: string, consumer: string, alertingEntity: string, operation: string): string;
}
