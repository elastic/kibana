import type { RuleData } from './rule_loader';
import type { TaskRunnerContext } from './types';
export declare const updateRuleMissingUiamKeyTag: (context: TaskRunnerContext, ruleId: string, spaceId: string, ruleData: RuleData) => Promise<RuleData>;
