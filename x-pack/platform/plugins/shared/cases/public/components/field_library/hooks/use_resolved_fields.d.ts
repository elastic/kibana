import type { Field, InlineField } from '../../../../common/types/domain/template/fields';
/**
 * Resolves a list of template fields, substituting each `{ $ref }` entry with the
 * current definition from the field library. Inline fields are passed through unchanged.
 * Refs that cannot be resolved (unknown name, bad YAML, or not an inline field) are silently
 * dropped so the rest of the form still renders.
 */
export declare const useResolvedFields: (fields: Field[], owner?: string | string[]) => {
    resolvedFields: InlineField[];
    isLoading: boolean;
};
