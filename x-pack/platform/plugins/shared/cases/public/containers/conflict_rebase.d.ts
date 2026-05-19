import type { CaseUI } from './types';
export type CaseWithOptionalComments = Omit<CaseUI, 'comments'> & {
    comments?: CaseUI['comments'];
};
export type CaseConflictRebaseDecision = 'only_system_drift' | 'conflicting_case_change';
interface RebaseCaseMutationOnConflictParams<TRequest, TResponse> {
    request: TRequest;
    /**
     * The server-side state of the affected cases *before* the user's mutation
     * was applied — i.e. what was fetched/cached, not the locally-modified copy.
     * This is compared against the freshly-fetched latest to detect whether a 409
     * was caused only by system writes. Passing a locally-modified (A*) state here
     * will cause system-only drift to be misclassified as a real conflict.
     */
    preRequestServerState: CaseWithOptionalComments[];
    executeRequest: (request: TRequest) => Promise<TResponse>;
    fetchLatestCase: (caseId: string) => Promise<CaseWithOptionalComments>;
    buildRetryRequest: (args: {
        request: TRequest;
        latestCases: Map<string, CaseWithOptionalComments>;
    }) => TRequest;
}
/**
 * Only "409 - Conflict" is safe to retry: it means an optimistic-concurrency mismatch that
 * __may__ have been caused by a benign server-side write. Any other status code represents a
 * genuine failure (validation error, auth problem, etc.) that retrying won't fix.
 */
export declare const isRetryableCaseConflictError: (error: unknown) => boolean;
/**
 * Decides whether a 409 can be safely retried.
 * Returns 'only_system_drift'        → the stale and latest cases differ only in
 *                                       system-managed fields; retry is safe.
 * Returns 'conflicting_case_change'  → a user-owned field changed between the
 *                                       original request and now; the caller must
 *                                       surface the conflict to the user.
 */
export declare const getCaseConflictRebaseDecision: ({ staleCases, latestCases, }: {
    staleCases: CaseWithOptionalComments[];
    latestCases: CaseWithOptionalComments[];
}) => CaseConflictRebaseDecision;
/**
 * Executes a case mutation and transparently retries once if the server returns a
 * 409 Conflict that was caused solely by a server-side system write (e.g. the
 * `incrementalId` background task bumping the ES document version).
 *
 * Flow:
 *  1. Attempt the mutation with the original request.
 *  2. On 409: fetch the latest version of every affected case.
 *  3. Compare stale vs. latest (ignoring system-managed fields).
 *     - If only system fields changed → rebuild the request with fresh version
 *       tokens and retry. The user's intended change is preserved.
 *     - If any user-owned field changed → a real concurrent edit occurred;
 *       re-throw the original error so the caller can inform the user.
 *  4. Any non-409 error is re-thrown immediately without a retry attempt.
 */
export declare const rebaseCaseMutationOnConflict: <TRequest, TResponse>({ request, preRequestServerState, executeRequest, fetchLatestCase, buildRetryRequest, }: RebaseCaseMutationOnConflictParams<TRequest, TResponse>) => Promise<TResponse>;
export {};
