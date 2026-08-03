import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { ruleLifecycleEventSchema } from './schemas';
export declare const RuleEnabledTriggerId: "alerting.ruleEnabled";
export declare const ruleEnabledTriggerCommonDefinition: CommonTriggerDefinition<typeof ruleLifecycleEventSchema>;
