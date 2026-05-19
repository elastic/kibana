import type { RuleTypeParams } from '../../../../types';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { ResolvedSanitizedRule } from '../../../../types';
export interface ResolveParams {
    id: string;
    includeSnoozeData?: boolean;
}
export declare function resolveRule<Params extends RuleTypeParams = never>(context: RulesClientContext, { id, includeSnoozeData }: ResolveParams): Promise<ResolvedSanitizedRule<Params>>;
