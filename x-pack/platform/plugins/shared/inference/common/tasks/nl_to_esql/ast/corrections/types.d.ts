import type { ESQLSingleAstItem } from '@elastic/esql/types';
/**
 * Represents a correction that was applied to the query
 */
export interface QueryCorrection {
    /** The type of correction */
    type: string;
    /** A human-friendly-ish description of the correction */
    description: string;
    /** The parent node the correction was applied to */
    node: ESQLSingleAstItem;
}
