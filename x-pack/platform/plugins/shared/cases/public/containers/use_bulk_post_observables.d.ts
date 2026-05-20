import type { ServerError } from '../types';
export declare const useBulkPostObservables: () => import("@kbn/react-query").UseMutationResult<import("./types").CaseUI, ServerError, {
    caseId: string;
    observables: {
        typeKey: string;
        value: string;
        description: string | null;
    }[];
}, unknown>;
export type UseBulkPostObservables = ReturnType<typeof useBulkPostObservables>;
