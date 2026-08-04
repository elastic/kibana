import type { GroupingMode, ActionPolicyDestination, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import type { InlineWorkflowActionDraft } from '@kbn/alerting-v2-rule-form';
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
    /**
     * Single-step workflow drafts pending creation. On submit each draft is
     * turned into a workflow and appended to `destinations`; they are never sent
     * to the action policy API directly.
     */
    inlineActions: InlineWorkflowActionDraft[];
}
