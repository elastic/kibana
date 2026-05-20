/**
 * Accessor for reading field values using flexible dot-notation.
 *
 * @example
 * painlessFieldAccessor('order.total') -> "$('order.total', null)"
 */
export declare function painlessFieldAccessor(field: string, defaultValue?: string): string;
/**
 * Accessor for writing field values using flat key notation.
 * Uses single bracket with the full dotted path to create flat keys,
 * consistent with how $() reads them.
 *
 * @example
 * painlessFieldAssignment('order.total') -> "ctx['order.total']"
 */
export declare function painlessFieldAssignment(field: string): string;
