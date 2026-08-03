import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { ruleLifecycleEventSchema } from './schemas';
export declare const RuleUpdatedTriggerId: "alerting.ruleUpdated";
export declare const ruleUpdatedTriggerCommonDefinition: CommonTriggerDefinition<typeof ruleLifecycleEventSchema>;
