import type { z } from '@kbn/zod/v4';
import type { CaseUI } from '../../../common';
import type { FieldSchema } from '../../../common/types/domain/template/fields';
import type { ServerError } from '../../types';
type Field = z.infer<typeof FieldSchema>;
interface ChangeAppliedTemplateArgs {
    caseData: CaseUI;
    /** Pass null to remove the applied template. */
    newTemplate: {
        id: string;
        version: number;
        fields: Field[];
    } | null;
}
export declare const computeNewExtendedFields: (newTemplateFields: Field[], currentExtendedFields: Record<string, unknown>) => Record<string, string>;
export declare const useChangeAppliedTemplate: () => import("@kbn/react-query").UseMutationResult<import("../../../common").CasesUI, ServerError, ChangeAppliedTemplateArgs, unknown>;
export {};
