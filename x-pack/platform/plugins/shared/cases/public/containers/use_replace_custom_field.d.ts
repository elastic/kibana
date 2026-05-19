import type { ServerError } from '../types';
import type { CaseUI } from './types';
interface ReplaceCustomField {
    caseId: string;
    customFieldId: string;
    customFieldValue: string | number | boolean | null;
    caseVersion: string;
    caseData: CaseUI;
}
export declare const useReplaceCustomField: () => import("@kbn/react-query").UseMutationResult<{
    key: string;
    type: import("../../common/types/domain").CustomFieldTypes.TEXT;
    value: string | null;
} | {
    key: string;
    type: import("../../common/types/domain").CustomFieldTypes.TOGGLE;
    value: boolean | null;
} | {
    key: string;
    type: import("../../common/types/domain").CustomFieldTypes.NUMBER;
    value: number | null;
}, ServerError, ReplaceCustomField, unknown>;
export type UseReplaceCustomField = ReturnType<typeof useReplaceCustomField>;
export {};
