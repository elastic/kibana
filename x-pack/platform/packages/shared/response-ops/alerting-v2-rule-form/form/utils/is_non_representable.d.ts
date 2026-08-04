import type { RuleResponse } from '@kbn/alerting-v2-schemas';
/**
 * Determines whether a rule (from the API response) contains features that
 * the GUI form cannot represent. Such rules must be edited in YAML mode only.
 *
 * Non-representable cases:
 * - `alert` kind with `standalone` query format (form requires composed base+segments)
 * - `recovery_strategy` outside the form's supported set (`no_breach` | `query` | `none`; null/unset is fine)
 * - `no_data_strategy: 'emit'` (temporarily rejected by the write API; dropdown has no option)
 *
 * Note: `query.no_data` is not checked separately because it can only appear on
 * standalone format queries, which the `format === 'standalone'` check already catches.
 */
export declare const isNonRepresentableRule: (rule: RuleResponse) => boolean;
