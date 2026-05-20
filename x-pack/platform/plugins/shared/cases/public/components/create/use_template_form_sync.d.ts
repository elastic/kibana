import type { UseFormReturn } from 'react-hook-form';
import type { ParsedTemplate } from '../../../common/types/domain/template/v1';
interface UseTemplateFormSyncReturn {
    template: ParsedTemplate | undefined;
    isLoading: boolean;
}
/**
 * Syncs the selected template into the create-case form.
 *
 * - Standard case fields (title, description, tags, severity, category) are
 *   written to the parent form (`@kbn/es-ui-shared-plugin` form_lib).
 * - Extended (template-defined) fields are written to the inner react-hook-form
 *   instance owned by `CreateCaseTemplateFields` and mirrored back to the
 *   parent's `extendedFields` field by that component.
 */
export declare const useTemplateFormSync: (innerForm: UseFormReturn) => UseTemplateFormSyncReturn;
export {};
