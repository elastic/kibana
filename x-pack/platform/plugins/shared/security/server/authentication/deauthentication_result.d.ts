/**
 * Represents status that `DeauthenticationResult` can be in.
 */
declare enum DeauthenticationResultStatus {
    /**
     * Deauthentication of the user can't be handled (e.g. provider doesn't
     * support sign out).
     */
    NotHandled = "not-handled",
    /**
     * User has been successfully deauthenticated.
     */
    Succeeded = "succeeded",
    /**
     * User can't be deauthenticated. Result should include the error that
     * describes the reason of failure.
     */
    Failed = "failed",
    /**
     * Deauthentication consists of multiple steps and user should be redirected
     * to a different location to complete it.
     */
    Redirected = "redirected"
}
/**
 * Represents additional deauthentication options.
 */
interface DeauthenticationOptions {
    error?: Error;
    redirectURL?: string;
}
/**
 * Represents the result of the deauthentication attempt.
 */
export declare class DeauthenticationResult {
    private readonly status;
    private readonly options;
    /**
     * Produces `DeauthenticationResult` for the case when user deauthentication isn't supported.
     */
    static notHandled(): DeauthenticationResult;
    /**
     * Produces `DeauthenticationResult` for the case when deauthentication succeeds.
     */
    static succeeded(): DeauthenticationResult;
    /**
     * Produces `DeauthenticationResult` for the case when deauthentication fails.
     * @param error Error that occurred during deauthentication attempt.
     */
    static failed(error: Error): DeauthenticationResult;
    /**
     * Produces `DeauthenticationResult` for the case when deauthentication needs user to be redirected.
     * @param redirectURL URL that should be used to redirect user to complete deauthentication.
     */
    static redirectTo(redirectURL: string): DeauthenticationResult;
    /**
     * Error that occurred during deauthentication (only available for `failed` result).
     */
    get error(): Error | undefined;
    /**
     * URL that should be used to redirect user to complete authentication only available
     * for `redirected` result).
     */
    get redirectURL(): string | undefined;
    /**
     * Constructor is not supposed to be used directly, please use corresponding static factory methods instead.
     * @param status Indicates the status of the deauthentication result.
     * @param [options] Optional argument that includes additional deauthentication options.
     */
    constructor(status: DeauthenticationResultStatus, options?: DeauthenticationOptions);
    /**
     * Indicates that deauthentication isn't supported.
     */
    notHandled(): boolean;
    /**
     * Indicates that deauthentication succeeded.
     */
    succeeded(): boolean;
    /**
     * Indicates that deauthentication failed.
     */
    failed(): boolean;
    /**
     * Indicates that deauthentication needs user to be redirected.
     */
    redirected(): boolean;
}
export {};
