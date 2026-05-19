import type { GroupingMode, ActionPolicyDestination, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
export interface ActionPolicyFormState {
    name: string;
    description: string;
    tags: string[];
    matcher: string;
    groupingMode: GroupingMode;
    groupBy: string[];
    throttleStrategy: ThrottleStrategy;
    throttleInterval: string;
    destinations: ActionPolicyDestination[];
}
