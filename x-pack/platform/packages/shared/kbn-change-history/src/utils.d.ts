import type { ChangeHistoryFieldsToMask } from './types';
export declare const sha256: (text: string) => string;
/** Placeholder stored in place of a redacted value. */
export declare const REDACTED = "[redacted]";
export interface SanitizeFieldsOpts {
    fieldsToHash?: ChangeHistoryFieldsToMask;
    fieldsToRedact?: ChangeHistoryFieldsToMask;
    salt?: string;
}
/**
 * Masks sensitive string fields in a snapshot, by hashing or redacting. Redaction wins when a
 * field matches both maps. Returns a new snapshot when anything changes.
 *
 * @param snapshot - The snapshot to process.
 * @param opts.fieldsToHash - Field paths to replace with a salted SHA-256 digest (high-entropy secrets only).
 * @param opts.fieldsToRedact - Field paths to replace with a `[redacted]` placeholder (low-entropy data).
 * @param opts.salt - Salt for the hash, use the object.id. Required only when hashing.
 * @returns The flattened paths that were hashed/redacted and the masked snapshot.
 * @example
 *   const snapshot = { api: { key: 'sk-9f8a7b6c5d4e' }, owner: { email: 'bob@example.com' } };
 *   const result = sanitizeFields(snapshot, {
 *     fieldsToHash: { api: { key: true } },
 *     fieldsToRedact: { owner: { email: true } },
 *     salt: 'rule-id-123',
 *   });
 *   // {
 *   //  fields: { hashed: ['api.key'], redacted: ['owner.email'] },
 *   //  snapshot: { api: { key: '2da53d7f04d1' }, owner: { email: '[redacted]' } }
 *   // }
 */
export declare function sanitizeFields(snapshot: Record<string, any>, { fieldsToHash, fieldsToRedact, salt }?: SanitizeFieldsOpts): {
    fields: {
        hashed: string[];
        redacted: string[];
    };
    snapshot: Record<string, any>;
};
