export type GlobalSearchFindErrorType = 'invalid-license';
/**
 * Error thrown from the {@link GlobalSearchPluginStart.find | GlobalSearch find API}'s result observable
 *
 * @public
 */
export declare class GlobalSearchFindError extends Error {
    readonly type: GlobalSearchFindErrorType;
    static invalidLicense(message: string): GlobalSearchFindError;
    private constructor();
}
