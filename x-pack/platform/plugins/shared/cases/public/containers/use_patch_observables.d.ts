import type { ServerError } from '../types';
export declare const usePatchObservable: (caseId: string, observableId: string) => import("@tanstack/react-query").UseMutationResult<import("./types").CaseUI, ServerError, {
    observable: {
        value: string;
        description: string | null;
    };
}, unknown>;
export type UsePatchObservables = ReturnType<typeof usePatchObservable>;
