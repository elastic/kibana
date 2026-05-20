import type { ESQLAstCommand, ESQLAstItem } from '@elastic/esql/types';
import type { Condition } from '../../../../types/conditions';
import type { DissectGrokPatternField } from '../../../../types/formats';
/**
 * Cast (or create) each listed field to string to normalize branch schemas
 * @param fieldNames List of field names to cast
 * @returns List of ESQL AST commands to perform the casts
 * */
export declare function castFieldsToString(fieldNames: string[]): ESQLAstCommand[];
/**
 * Cast each GROK field to its configured type (int, float, keyword)
 * @param grokFields List of fields with their configured GROK types
 * @returns List of ESQL AST commands to perform the casts
 */
export declare function castFieldsToGrokTypes(grokFields: DissectGrokPatternField[]): ESQLAstCommand[];
export declare function combineAnd(predicates: ESQLAstItem[]): ESQLAstItem | null;
export declare function combineOr(predicates: ESQLAstItem[]): ESQLAstItem | null;
/**
 * Creates a WHERE command to filter out documents with missing source fields when `ignore_missing: false`.
 * This simulates Ingest Pipeline's "field [field] not present" error behavior by pre-filtering documents.
 *
 * Behavioral Context:
 * - ignore_failure is implicitly false (not supported in Streamlang DSL yet)
 * - When ignore_failure = false, Ingest Pipeline fails on both missing fields AND pattern mismatches
 * - ES|QL can only simulate the missing field case with WHERE filtering
 * - Pattern mismatch failures cannot be (in a reasonable fashion) simulated in ES|QL (they nullify target fields instead)
 *
 * @param ignoreMissing - If false, returns WHERE command to filter missing fields
 * @param sourceFields - The source field names to check for NULL/missing values
 * @returns WHERE command if filtering needed, undefined otherwise
 *
 * @example
 * // Single field
 * buildIgnoreMissingFilter(false, 'message')
 * // → WHERE NOT(`message` IS NULL)
 *
 * @example
 * // Multiple fields (e.g., network_direction)
 * buildIgnoreMissingFilter(false, 'source.ip', 'destination.ip')
 * // → WHERE NOT(`source.ip` IS NULL) AND NOT(`destination.ip` IS NULL)
 */
export declare function buildIgnoreMissingFilter(ignoreMissing: boolean, ...sourceFields: string[]): ESQLAstCommand | undefined;
/**
 * Creates a WHERE command to filter out documents with existing target fields when `override: false`.
 * This simulates Ingest Pipeline's "field [field] already exists" error behavior by pre-filtering documents.
 *
 * Behavioral Context:
 * - ignore_failure is implicitly false (not supported in Streamlang DSL yet)
 * - When ignore_failure = false, override = false make Ingest Pipeline fail if target field already exists
 * - ES|QL uses WHERE filtering to exclude documents with existing target fields
 * - This aligns the behavior between Ingest Pipeline errors and ES|QL filtering
 *
 * @param targetField - The target field name to check for existence
 * @param override - If false, returns WHERE command to filter existing target fields
 * @returns WHERE command if filtering needed, undefined otherwise
 */
export declare function buildOverrideFilter(targetField: string, override: boolean): ESQLAstCommand | undefined;
/**
 * Creates an EVAL command that conditionally routes the source expression through a CASE guard,
 * storing either the real value or a neutral fallback ("") in a temp column.
 *
 * @param condition - The Streamlang condition that guards execution
 * @param sourceExpression - The field/expression to pass through when the condition is true
 * @param tempColumn - Name of the temporary output column
 * @returns EVAL command: `EVAL <tempColumn> = CASE(<condition>, <sourceExpression>, "")`
 */
export declare function buildConditionalEval(condition: Condition, sourceExpression: string, tempColumn: string): ESQLAstCommand;
/**
 * Creates a single EVAL command with COALESCE assignments that merge temp-prefixed columns into target-prefixed columns.
 *
 * @param fields - Field names to merge (without prefix)
 * @param tempPrefix - Prefix used for the temporary output columns
 * @param targetPrefix - Prefix used for the final target columns
 * @returns EVAL command: `EVAL <targetPrefix>.<f> = COALESCE(<tempPrefix>.<f>, <targetPrefix>.<f>), ...`
 */
export declare function buildCoalescePrefixedFieldsEval(fields: string[], tempPrefix: string, targetPrefix: string): ESQLAstCommand;
/**
 * Creates a DROP command for a list of column names.
 *
 * @param columns - Column names to drop
 * @returns DROP command: `DROP <col1>, <col2>, ...`
 */
export declare function buildDropColumns(columns: string[]): ESQLAstCommand;
export declare function buildWhereCondition(fromField: string, ignoreMissing: boolean, where: Condition | undefined, conditionToESQL: (c: Condition) => ESQLAstItem): ESQLAstItem;
