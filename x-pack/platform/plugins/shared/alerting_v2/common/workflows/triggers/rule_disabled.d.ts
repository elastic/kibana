import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { ruleLifecycleEventSchema } from './schemas';
export declare const RuleDisabledTriggerId: "alerting.ruleDisabled";
export declare const ruleDisabledTriggerCommonDefinition: CommonTriggerDefinition<typeof ruleLifecycleEventSchema>;
