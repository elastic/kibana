import type { Field, InlineField } from '../../../../common/types/domain/template/fields';
/**
 * Resolves the non-global fields of a template definition:
 * 1. Fetches the owner's global field definitions (those already rendered by the
 *    GlobalCaseFields section and not owned by any template).
 * 2. Strips inline fields whose name appears in the global set so they are not
 *    shown twice in the UI.
 * 3. Passes the remaining fields through `useResolvedFields` to expand `$ref`
 *    entries into their full inline definition.
 */
export declare const useTemplateNonGlobalFields: (templateDefinitionFields: Field[], owner: string) => {
    resolvedFields: InlineField[];
    isLoading: boolean;
};
