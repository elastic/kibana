/**
 * Represents a message with normalized whitespace and tracking info
 */
export interface NormalizedMessage {
    /** The message with consecutive whitespace collapsed to single spaces */
    normalized: string;
    /**
     * Map of original position to (original char, normalized position)
     * Used to map positions in normalized string back to original
     */
    positionMap: Array<{
        originalChar: string;
        normalizedPos: number;
    }>;
    /**
     * Positions in the NORMALIZED string where whitespace was collapsed.
     * These positions mark where the collapsed whitespace started (before the field content).
     */
    collapsedWhitespacePositions: number[];
}
/**
 * Normalize consecutive SPACES (not tabs) in messages to single spaces.
 *
 * This fixes the core issue where varying amounts of spaces between fields
 * (e.g., "INFO   -" vs "WARN -" vs "ERROR  -") cause delimiter detection to fail
 * because delimiters appear at different positions.
 *
 * IMPORTANT: Tabs are NOT normalized because they are often used as actual
 * delimiters in tab-delimited formats. Only consecutive SPACES are collapsed.
 *
 * After normalization, all delimiters align at consistent positions, allowing
 * the existing algorithm to work. Fields that had trailing whitespace are marked
 * for right-padding modifiers.
 *
 * Example:
 *   Input:  "INFO   - - [date]"  (3 spaces after INFO)
 *           "WARN - - [date]"    (1 space after WARN)
 *           "ERROR  - - [date]"  (2 spaces after ERROR)
 *
 *   Output: "INFO - - [date]"    (marked: field_1 needs right-padding)
 *           "WARN - - [date]"    (no marker)
 *           "ERROR - - [date]"   (marked: field_1 needs right-padding)
 */
export declare function normalizeWhitespace(messages: string[]): NormalizedMessage[];
/**
 * Map a position in the normalized string back to the original position.
 * Used to map delimiter positions after normalization back to original messages.
 */
export declare function mapNormalizedToOriginalPosition(normalizedPos: number, positionMap: NormalizedMessage['positionMap']): number;
/**
 * Check if a delimiter at specific positions corresponds to collapsed whitespace.
 * A field needs right-padding if the delimiter after it starts at a position
 * where whitespace was collapsed in ANY message.
 *
 * @param delimiterPositions - Array of positions where the delimiter appears (one per message)
 * @param normalizedMessages - Array of normalized message data
 * @returns true if the field before this delimiter needs right-padding modifier
 */
export declare function needsRightPadding(delimiterPositions: number[], normalizedMessages: NormalizedMessage[], delimiterLiteral: string): boolean;
