export interface ResolveTimeFieldParams {
    dateFields: string[];
    currentTimeField?: string;
}
/**
 * Picks the time field for a rule's lookback range filter from the date fields
 * present on the index. Returns `null` when nothing can be resolved so callers
 * can fail/force a selection instead of persisting a non-existent time field.
 */
export declare const resolveTimeField: ({ dateFields, currentTimeField, }: ResolveTimeFieldParams) => string | null;
