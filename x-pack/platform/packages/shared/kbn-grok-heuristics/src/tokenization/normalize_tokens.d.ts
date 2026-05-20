import type { SingleLineToken, NormalizedToken } from '../types';
/** --------------------------------------------------------------
 *  Public API
 *  --------------------------------------------------------------*/
/**
 * Normalises tokens across multiple log entries for a single column.
 *
 * Strategy (variable‑length aware)
 * --------------------------------
 * 1. Determine the **maximum** row length.  Merging begins with pointers:
 *      leftIdx  = 0
 *      rightOff = 1 (offset from each row's tail)
 * 2. Alternate scanning: left, right, left+1, right+1 …
 *    • Left side uses absolute index (from start).
 *    • Right side uses per‑row negative offset (row.length − rightOff).
 * 3. A side stops when:
 *      • The candidate token is NOT common, OR
 *      • For any row, the candidate index would collide with the other pointer.
 * 4. Residual middle segment is normalised via fixed‑/variable‑length logic.
 */
export declare function normalizeTokens(tokensPerLine: SingleLineToken[][]): NormalizedToken[];
