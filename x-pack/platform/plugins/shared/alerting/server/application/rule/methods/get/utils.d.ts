import type { getRuleSo } from '../../../../data/rule';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { SanitizedRule } from '../../../../types';
import type { RuleParams } from '../../types';
import type { GetRuleParams } from './types';
type TransformToSanitizedRuleOptions = Omit<GetRuleParams, 'id'>;
type RuleSo = Awaited<ReturnType<typeof getRuleSo>>;
export declare function transformToSanitizedRule<Params extends RuleParams = never>(context: RulesClientContext, ruleSo: RuleSo, options: TransformToSanitizedRuleOptions): Promise<SanitizedRule<Params>>;
export {};
