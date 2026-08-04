import type { RuleKind } from '@kbn/alerting-v2-schemas';
import type { RuleQuery } from '../../../form/types';
/**
 * RHF `rules.validate` for the committed query field.
 * Returns `true` when valid, otherwise an i18n error message.
 */
export declare const validateCommittedQuery: (query: RuleQuery, kind: RuleKind, queryCommitted: boolean) => true | string;
/** Shared boolean gate for footer submit / step helpers. */
export declare const isCommittedQueryValid: (query: RuleQuery, kind: RuleKind, queryCommitted: boolean) => boolean;
