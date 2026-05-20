import type { SavedObject } from '@kbn/core-saved-objects-server';
export interface CaseIdIncrementerPersistedAttributes {
    '@timestamp': number;
    last_id: number;
    updated_at: number;
}
export type CaseIdIncrementerTransformedAttributes = CaseIdIncrementerPersistedAttributes;
export declare const CaseIdIncrementerTransformedAttributesRt: import("io-ts").ExactC<import("io-ts").TypeC<{
    '@timestamp': import("io-ts").NumberC;
    updated_at: import("io-ts").NumberC;
    last_id: import("io-ts").NumberC;
}>>;
export type CaseIdIncrementerSavedObject = SavedObject<CaseIdIncrementerPersistedAttributes>;
