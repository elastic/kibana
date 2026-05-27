import { type ThresholdFormValues } from './form_types';
/**
 * Builds an ES|QL query string from threshold rule builder form fields
 * using the @elastic/esql AST builder and pretty printer.
 *
 * Example output:
 *   FROM logs-*
 *     | WHERE service.name == "api"
 *     | STATS errors = COUNT(*) WHERE status >= 500, total = COUNT(*)
 *     | EVAL error_rate = errors / total * 100
 *     | WHERE error_rate > 5
 */
export declare const buildThresholdEsql: (values: ThresholdFormValues) => string;
