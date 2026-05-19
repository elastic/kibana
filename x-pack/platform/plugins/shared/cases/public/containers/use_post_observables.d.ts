import type { ServerError } from '../types';
export declare const usePostObservable: (caseId: string) => import("@kbn/react-query").UseMutationResult<import("./types").CaseUI, ServerError, {
    observable: {
        typeKey: string;
        value: string;
        description: string | null;
    };
}, unknown>;
export type UsePostObservables = ReturnType<typeof usePostObservable>;
