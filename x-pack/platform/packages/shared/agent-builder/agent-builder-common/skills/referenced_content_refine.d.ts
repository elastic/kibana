/**
 * Stable codes for referenced-content cross-field rules shared by API and UI validation.
 * Consumers map codes to localized or API-safe messages.
 */
export declare const REFERENCED_CONTENT_REFINE_ISSUE_CODE: {
    readonly PATH_PROTOCOL: "referenced_content_path_protocol";
    readonly PATH_TRAVERSAL: "referenced_content_path_traversal";
    readonly RESERVED_SKILL_NAME: "referenced_content_reserved_skill_name";
    readonly DUPLICATE_PATH: "referenced_content_duplicate_path";
};
export type ReferencedContentRefineIssueCode = (typeof REFERENCED_CONTENT_REFINE_ISSUE_CODE)[keyof typeof REFERENCED_CONTENT_REFINE_ISSUE_CODE];
export interface ReferencedContentRefineIssue {
    code: ReferencedContentRefineIssueCode;
    itemIndex: number;
    field: 'relativePath' | 'name';
}
/**
 * Pure validation for referenced_content items beyond per-field Zod checks.
 * Used by {@link skillCreateRequestSchema} / {@link skillUpdateRequestSchema} and the Agent Builder skill form.
 */
export declare function collectReferencedContentRefineIssues(items: ReadonlyArray<{
    name: string;
    relativePath: string;
}>): ReferencedContentRefineIssue[];
