/**
 * Returns a name which is safe to use in elasticsearch aggregations for the supplied
 * field name. Aggregation names must be alpha-numeric and can only contain '_' and '-' characters,
 * so if the supplied field names contains disallowed characters, the provided index
 * identifier is used to return a safe 'dummy' name in the format 'field_index' e.g. field_0, field_1
 *
 * @param fieldName - the field name to check
 * @param index - the index number to be used for the safe aggregation name
 * @returns safe aggregation name
 */
export declare function getSafeAggregationName(fieldName: string, index: number): string;
