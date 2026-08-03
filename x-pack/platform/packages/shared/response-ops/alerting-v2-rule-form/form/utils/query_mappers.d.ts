import type { RuleResponse, Query } from '@kbn/alerting-v2-schemas';
import type { RuleQuery } from '../types';
/**
 * Maps form `RuleQuery` to the API `Query` shape.
 */
export declare const ruleQueryToApiQuery: (query: RuleQuery) => Query;
/**
 * Maps an API `Query` response back to the form's `RuleQuery`. Recovery is
 * only included when `recovery_strategy` is `'query'`.
 */
export declare const apiQueryToFormQuery: (q: RuleResponse["query"], recoveryStrategy?: RuleResponse["recovery_strategy"]) => RuleQuery;
