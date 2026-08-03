import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { ruleLifecycleEventSchema } from './schemas';
export declare const RuleDeletedTriggerId: "alerting.ruleDeleted";
export declare const ruleDeletedTriggerCommonDefinition: CommonTriggerDefinition<typeof ruleLifecycleEventSchema>;
