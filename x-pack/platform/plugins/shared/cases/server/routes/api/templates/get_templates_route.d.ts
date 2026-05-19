/**
 * GET /internal/cases/templates
 * List all templates (excluding soft-deleted ones by default)
 */
export declare const getTemplatesRoute: import("../types").CaseRoute<{}, {
    page: number;
    perPage: number;
    sortField: "name" | "owner" | "author" | "isDefault" | "fieldCount" | "templateId" | "templateVersion" | "deletedAt" | "usageCount" | "lastUsedAt" | "isLatest";
    sortOrder: "asc" | "desc";
    search: string;
    tags: string[];
    author: string[];
    owner: string[];
    isDeleted: boolean;
    isEnabled?: boolean | undefined;
}, {}>;
