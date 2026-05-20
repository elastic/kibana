import type { MaskedMessage } from '../types';
/**
 * Processes a given message string to mask specific patterns (e.g., IP addresses, URIs,
 * delimited content like brackets or quotes) using predefined regex patterns.
 * Matches are replaced with placeholders, and the original values are stored in a `literals` array.
 *
 * @param message - The input string to be masked.
 * @returns An object containing the masked string and the array of original literals.
 */
export declare function maskFirstPassPatterns(message: string): MaskedMessage;
/**
 * Restores the original values in a masked string by replacing placeholders with their corresponding
 * values from the `literals` array.
 *
 * @param masked - The masked string containing placeholders.
 * @param literals - The array of original values to restore.
 * @returns The restored string with placeholders replaced by their original values.
 */
export declare function restoreMaskedPatterns(masked: string, literals: string[]): string;
