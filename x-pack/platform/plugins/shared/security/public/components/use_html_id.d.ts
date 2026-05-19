/**
 * Generates an ID that can be used for HTML elements.
 *
 * @param prefix Prefix of the id to be generated
 * @param suffix Suffix of the id to be generated
 *
 * @example
 * ```typescript
 * const titleId = useHtmlId('changePasswordForm', 'title');
 *
 * <EuiForm aria-labelledby={titleId}>
 *   <h2 id={titleId}>Change password</h2>
 * </EuiForm>
 * ```
 */
export declare function useHtmlId(prefix?: string, suffix?: string): string;
