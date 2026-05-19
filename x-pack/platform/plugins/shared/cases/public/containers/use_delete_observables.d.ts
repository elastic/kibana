import type { ServerError } from '../types';
export declare const useDeleteObservable: (caseId: string, observableId: string) => import("@kbn/react-query").UseMutationResult<void, ServerError, void, unknown>;
export type UseDeleteObservables = ReturnType<typeof useDeleteObservable>;
