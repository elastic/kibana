import type { DissectField, DelimiterNode } from './types';
/**
 * Normalizes field boundaries by detecting common trailing non-alphanumeric characters
 * that should be part of the delimiter instead of the field value.
 *
 * For example, if all values in a field end with ':', this function will:
 * 1. Remove ':' from all field values
 * 2. Add ':' to the beginning of the following delimiter
 *
 * This handles cases like:
 * - 'sshd(pam_unix)[11741]:' -> 'sshd(pam_unix)[11741]' + ': '
 * - 'su(pam_unix)[10583]:' -> 'su(pam_unix)[10583]' + ': '
 * - 'logrotate:' -> 'logrotate' + ': '
 *
 * @param fields - Array of fields extracted between delimiters
 * @param delimiterTree - Array of delimiter nodes (will be modified in-place)
 * @returns Modified fields array with normalized boundaries
 */
export declare function normalizeFieldBoundaries(fields: DissectField[], delimiterTree: DelimiterNode[]): DissectField[];
