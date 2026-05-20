import type { AlertingActions as AlertingActionsType } from '@kbn/security-plugin-types-server';
export declare class AlertingActions implements AlertingActionsType {
    private readonly prefix;
    constructor();
    get(ruleTypeId: string, consumer: string, alertingEntity: string, operation: string): string;
}
