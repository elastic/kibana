import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { ruleLifecycleEventSchema } from './schemas';
export declare const RuleCreatedTriggerId: "alerting.ruleCreated";
export declare const ruleCreatedTriggerCommonDefinition: CommonTriggerDefinition<typeof ruleLifecycleEventSchema>;
