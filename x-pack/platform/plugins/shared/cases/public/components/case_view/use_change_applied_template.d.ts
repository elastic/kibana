import type { z } from '@kbn/zod/v4';
import type { TemplateSettings } from '../../../common/types/domain/template/v1';
import type { CaseUI } from '../../../common';
import type { FieldSchema } from '../../../common/types/domain/template/fields';
import type { ServerError } from '../../types';
type Field = z.infer<typeof FieldSchema>;
/**
 * A template's raw definition values as passed to {@link useChangeAppliedTemplate}. `settings` is
 * applied to the case; the case's connector is intentionally left untouched (applying a template
 * never changes an existing case's connector — see the apply-template modal notice). `null` removes
 * the applied template.
 */
export type NewAppliedTemplate = {
    id: string;
    version: number;
    fields: Field[];
    settings?: TemplateSettings;
} | null;
interface ChangeAppliedTemplateArgs {
    caseData: CaseUI;
    /** Pass null to remove the applied template. `settings` are the template's raw definition values. */
    newTemplate: NewAppliedTemplate;
    /**
     * Pre-validated extended field values (snake_case keys) collected from the fields form.
     * When provided, used directly instead of computing carry-over values via
     * `computeNewExtendedFields`. Only meaningful when `newTemplate` is non-null.
     */
    extendedFields?: Record<string, string>;
}
export declare const computeNewExtendedFields: (newTemplateFields: Field[], currentExtendedFields: Record<string, unknown>) => Record<string, string>;
export declare const useChangeAppliedTemplate: () => import("@tanstack/react-query").UseMutationResult<import("../../../common").CasesUI, ServerError, ChangeAppliedTemplateArgs, unknown>;
export {};
